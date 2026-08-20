import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CalendarCheck,
  Save,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Booking } from '../../types';

interface GuestProfileProps {
  bookings: Booking[];
}

export const GuestProfile: React.FC<GuestProfileProps> = ({ bookings }) => {
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [emergencyName, setEmergencyName] = useState(currentUser?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser?.emergency_contact_phone || '');
  const [profileImage, setProfileImage] = useState(currentUser?.profile_image || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCurrentUserProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        profile_image: profileImage.trim()
      });
      success('Profile updated successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-800 mb-1">
          Guest Account & Safety
        </div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">
          Profile & Emergency Contact Information
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Keep your contact information up to date for smooth check-in and emergency preparedness.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card & Avatar Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 text-center">
          <div className="relative inline-block">
            <img
              src={profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
              alt={fullName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-amber-100 shadow-md"
            />
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900">{fullName || 'Guest'}</h3>
            <p className="text-xs text-stone-500">{currentUser?.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Verified Guest
            </span>
          </div>

          <div className="pt-4 border-t border-stone-100 text-left">
            <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="flex justify-center gap-2">
              {sampleAvatars.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProfileImage(url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                    profileImage === url ? 'border-amber-600 ring-2 ring-amber-300' : 'border-stone-200'
                  }`}
                >
                  <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 text-xs text-stone-500 space-y-2 text-left">
            <div className="flex justify-between">
              <span>Total Lifetime Stays:</span>
              <strong className="text-stone-900">{bookings.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Account Member Since:</span>
              <strong className="text-stone-900">
                {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'August 2026'}
              </strong>
            </div>
          </div>
        </div>

        {/* Profile Edit Form (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
          <form onSubmit={handleSave} className="space-y-6">
            <h2 className="font-serif text-xl font-medium text-stone-900">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-stone-100 border border-stone-200 text-stone-500 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200 space-y-4">
              <h2 className="font-serif text-xl font-medium text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                Emergency Contact Details
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                In the rare event of an on-property emergency or medical situation, our on-duty manager will contact this person.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Mary Doe (Spouse / Relative)"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 999-0000"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
