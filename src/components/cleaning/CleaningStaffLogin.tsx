import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface CleaningStaffLoginProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const CleaningStaffLogin: React.FC<CleaningStaffLoginProps> = ({
  onLoginSuccess,
  onBack
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { loginCleaningStaff } = useAuth();
  const { success, error: toastError } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        setErrorMessage('Please enter both your housekeeping email and password.');
        setLoading(false);
        return;
      }

      await loginCleaningStaff(cleanEmail, password);
      setEmail('');
      setPassword('');
      success('Welcome to Housekeeping Portal!');
      onLoginSuccess();
    } catch (err: any) {
      const msg = err?.message || 'Failed to authenticate.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('chipo.housekeeping@example.com');
    setPassword('Staff123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-[#FDFCF9] to-[#F5F2ED]">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-[#E5E2D9] overflow-hidden">
        {/* Header */}
        <div className="bg-[#2C2C2C] text-white p-8 text-center relative border-b border-[#3E3E3E]">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] transition-colors"
              title="Return to Main Sanctuary"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-[#5A5A40] text-[#E5D7C7] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="text-xs uppercase tracking-[0.25em] text-[#C4A484] font-bold mb-1">
            THE HAVEN GUEST HOUSE
          </div>

          <h1 className="font-serif italic text-3xl font-medium tracking-tight text-[#FDFCF9]">
            HOUSEKEEPING LOGIN
          </h1>

          <p className="text-xs text-[#A3A094] mt-2 max-w-xs mx-auto">
            Authorized staff access for room turnover, sanitation logging & inspection readiness
          </p>
        </div>

        {/* Quick Fill Demo Helper */}
        <div className="bg-[#F5F2ED] px-6 py-3 border-b border-[#E5E2D9] flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#5A5A40] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            Housekeeping Credentials:
          </span>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-[10px] px-3 py-1 rounded-full bg-white border border-[#E5E2D9] text-[#5A5A40] font-bold uppercase tracking-wider hover:bg-[#FDFCF9] transition-colors shadow-2xs"
          >
            Quick Fill Staff Login
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Housekeeping Access Restricted</div>
              <div className="mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C887D] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="chipo.housekeeping@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C887D] absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#8C887D] hover:text-[#2C2C2C]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="bg-[#FDFCF9] px-8 py-4 border-t border-[#E5E2D9] text-center text-xs text-[#8C887D]">
          Housekeeping accounts are issued by the host administrator.
          {onBack && (
            <div className="mt-1">
              <button
                onClick={onBack}
                className="text-[#5A5A40] font-bold hover:underline"
              >
                Return to Guest Sanctuary
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
