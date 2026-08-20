import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onNavigate?: (view: string) => void;
  targetViewAfterLogin?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onNavigate,
  targetViewAfterLogin
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, currentUser } = useAuth();
  const { success, error } = useToast();

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  // Reset fields whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetFields();
    } else {
      resetFields();
    }
  }, [isOpen, initialMode]);

  // If already authenticated and modal is open, auto close immediately
  useEffect(() => {
    if (isOpen && currentUser) {
      handleClose();
    }
  }, [isOpen, currentUser]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          error('Please enter both your email address and password.');
          setLoading(false);
          return;
        }
        const userProfile = await login(email.trim(), password);
        resetFields();
        success('Signed in successfully.');
        onClose();

        if (onNavigate) {
          if (targetViewAfterLogin) {
            onNavigate(targetViewAfterLogin);
          } else if (userProfile) {
            if (userProfile.role === 'host') {
              onNavigate('admin-dashboard');
            } else if (userProfile.role === 'cleaning_staff') {
              onNavigate('cleaning-dashboard');
            } else {
              onNavigate('guest-dashboard');
            }
          } else {
            onNavigate('guest-dashboard');
          }
        }
      } else {
        if (!fullName.trim() || !email.trim()) {
          error('Please provide your full name and email address.');
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          error('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          error('Passwords do not match.');
          setLoading(false);
          return;
        }
        await register({
          full_name: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim()
        });
        resetFields();
        success('Account created successfully.');
        onClose();

        if (onNavigate) {
          onNavigate(targetViewAfterLogin || 'guest-dashboard');
        }
      }
    } catch (err: any) {
      error(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#FDFCF9] rounded-[28px] shadow-2xl max-w-md w-full overflow-hidden border border-[#E5E2D9]">
        {/* Header */}
        <div className="bg-[#2C2C2C] text-white p-6 relative border-b border-[#3E3E3E]">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[10px] uppercase tracking-widest text-[#C4A484] font-bold mb-1">
            The Haven Guest House
          </div>
          <h2 className="text-2xl font-serif italic font-normal text-[#FDFCF9]">
            {mode === 'login' ? 'Sign In to Your Account' : 'Create Guest Account'}
          </h2>
          <p className="text-xs text-[#E5E2D9]/80 mt-1">
            {mode === 'login'
              ? 'Enter your registered credentials to access your stays, dining, and concierge.'
              : 'Register to manage reservations and experience authentic hospitality.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tawanda Moyo"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+263 772 000 000"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider">
                Password *
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '••••••••' : 'At least 6 characters'}
                className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#8C887D] hover:text-[#2C2C2C]"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer toggle */}
        <div className="bg-[#F5F2ED] px-6 py-4 border-t border-[#E5E2D9] text-center text-xs text-[#8C887D]">
          {mode === 'login' ? (
            <div>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[#5A5A40] font-bold hover:underline"
              >
                Create an account
              </button>
            </div>
          ) : (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[#5A5A40] font-bold hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
