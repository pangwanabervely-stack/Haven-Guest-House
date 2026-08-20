import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile, UserRole } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: Profile | null;
  role: UserRole;
  isHost: boolean;
  isGuest: boolean;
  isCleaningStaff: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Profile | null>;
  loginCleaningStaff: (email: string, password: string) => Promise<Profile>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<Profile>) => Promise<void>;
  availableProfiles: Profile[];
  refreshProfiles: () => Promise<Profile[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfiles = async (): Promise<Profile[]> => {
    try {
      const profiles = await api.getProfiles();
      setAvailableProfiles(profiles);
      return profiles;
    } catch (err) {
      console.warn('Could not fetch profiles list:', err);
      return [];
    }
  };

  /**
   * Strictly fetches the user's profile record from public.profiles by auth UUID.
   * Does NOT guess or override roles based on email, name, or hardcoded values.
   */
  const fetchProfileForUser = async (userId: string): Promise<Profile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn(`Database error fetching profile for user ${userId}:`, error.message);
      }

      if (profile) {
        return profile as Profile;
      }

      // Safe Profile Self-Healing: If user is authenticated in Supabase Auth but profile row is missing,
      // create the profile row with the authenticated session data (guaranteed valid under RLS auth.uid() = id).
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        const userMeta = user.user_metadata || {};
        const fallbackProfile: Profile = {
          id: user.id,
          email: user.email || '',
          full_name: userMeta.full_name || user.email?.split('@')[0] || 'Guest',
          phone: userMeta.phone || '',
          emergency_contact_name: userMeta.emergency_contact_name || '',
          emergency_contact_phone: userMeta.emergency_contact_phone || '',
          role: (userMeta.role as UserRole) || 'guest',
          profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insErr } = await supabase
          .from('profiles')
          .upsert([fallbackProfile], { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        if (!insErr && inserted) {
          return inserted as Profile;
        }
        return fallbackProfile;
      }

      return null;
    } catch (err) {
      console.error('Unexpected error in fetchProfileForUser:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('Session retrieval note:', sessionError.message);
        }

        if (session?.user && isMounted) {
          const profile = await fetchProfileForUser(session.user.id);
          if (isMounted) {
            setCurrentUser(profile);
          }
        } else if (isMounted) {
          setCurrentUser(null);
        }

        if (isMounted) {
          await refreshProfiles();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen to real Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfileForUser(session.user.id);
        if (isMounted) {
          setCurrentUser(profile);
          await refreshProfiles();
        }
      } else if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) {
          setCurrentUser(null);
          setAvailableProfiles([]);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<Profile | null> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        throw new Error('Please enter both your email address and password.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (signInError) {
        throw new Error(signInError.message || 'Invalid login credentials.');
      }

      if (!data.user) {
        throw new Error('Authentication Error: No user session returned.');
      }

      const profile = await fetchProfileForUser(data.user.id);

      if (!profile) {
        throw new Error('Profile Error: Could not retrieve user profile from the database.');
      }

      setCurrentUser(profile);
      await refreshProfiles();
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const loginCleaningStaff = async (email: string, password: string): Promise<Profile> => {
    const profile = await login(email, password);
    if (!profile) {
      throw new Error('Could not load user profile.');
    }

    // STRICT VERIFICATION: Verify role = cleaning_staff
    if (profile.role !== 'cleaning_staff') {
      // Sign out immediately to avoid unauthorized session
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAvailableProfiles([]);
      throw new Error('Housekeeping access restricted: This account does not have cleaning staff permissions.');
    }

    return profile;
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      if (!data.password || data.password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (!data.full_name || !data.full_name.trim()) {
        throw new Error('Full name is required.');
      }

      // Step 1: Create auto-confirmed guest account via backend admin API
      let serverRegistered = false;
      try {
        await api.registerGuestAccount({
          email: cleanEmail,
          password: data.password,
          full_name: data.full_name.trim(),
          phone: data.phone?.trim() || '',
          emergency_contact_name: data.emergency_contact_name?.trim() || '',
          emergency_contact_phone: data.emergency_contact_phone?.trim() || ''
        });
        serverRegistered = true;
      } catch (srvErr: any) {
        console.warn('[Server Register Note]:', srvErr.message);
        // If error says user already exists, bubble that up directly
        if (srvErr.message?.toLowerCase().includes('already exists') || srvErr.message?.toLowerCase().includes('already registered')) {
          throw srvErr;
        }
      }

      // Step 2: If server registration didn't run, fallback to standard signUp
      if (!serverRegistered) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name.trim(),
              phone: data.phone?.trim() || '',
              emergency_contact_name: data.emergency_contact_name?.trim() || '',
              emergency_contact_phone: data.emergency_contact_phone?.trim() || '',
              role: 'guest'
            }
          }
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (authData.user) {
          const profileRow: Profile = {
            id: authData.user.id,
            full_name: data.full_name.trim(),
            email: cleanEmail,
            phone: data.phone?.trim() || '',
            emergency_contact_name: data.emergency_contact_name?.trim() || '',
            emergency_contact_phone: data.emergency_contact_phone?.trim() || '',
            role: 'guest',
            profile_image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('profiles')
            .upsert([profileRow]);
        }
      }

      // Step 3: Automatically log in the freshly created and confirmed guest user
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: data.password
      });

      if (loginError) {
        throw new Error(loginError.message);
      }

      if (loginData?.user) {
        const freshProfile = await fetchProfileForUser(loginData.user.id);
        if (freshProfile) {
          setCurrentUser(freshProfile);
        }
        await refreshProfiles();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAvailableProfiles([]);
      sessionStorage.clear();
    } catch (err) {
      console.error('Logout error:', err);
      setCurrentUser(null);
      setAvailableProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<Profile>) => {
    if (!currentUser) return;
    const updated = await api.updateProfile(currentUser.id, updates);
    setCurrentUser(updated);
    await refreshProfiles();
  };

  const role: UserRole = currentUser?.role || 'guest';
  const isHost = currentUser?.role === 'host';
  const isGuest = currentUser ? currentUser.role === 'guest' : false;
  const isCleaningStaff = currentUser?.role === 'cleaning_staff';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isHost,
        isGuest,
        isCleaningStaff,
        isLoading,
        login,
        loginCleaningStaff,
        register,
        logout,
        updateCurrentUserProfile,
        availableProfiles,
        refreshProfiles
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
