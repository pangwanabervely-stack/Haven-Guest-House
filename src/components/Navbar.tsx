import React, { useState } from 'react';
import {
  BedDouble,
  User,
  ShieldAlert,
  LogOut,
  CalendarCheck,
  MessageSquare,
  UtensilsCrossed,
  Sparkles,
  LayoutDashboard,
  Menu,
  X,
  CreditCard,
  Building,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { NotificationDropdown } from './notifications/NotificationDropdown';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { currentUser, role, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetViewForAuth, setTargetViewForAuth] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navTo = (view: string, bypassAuth = false) => {
    // Auth Guard for protected views
    const protectedGuestViews = ['guest-dashboard', 'guest-bookings', 'guest-room-service', 'guest-messages', 'guest-profile'];
    const protectedHostViews = ['admin-dashboard', 'admin-analytics', 'admin-bookings', 'admin-cleaning', 'admin-rooms', 'admin-payments', 'admin-room-service', 'admin-messages', 'admin-system-tools'];

    if (!currentUser && !bypassAuth) {
      if (protectedGuestViews.includes(view) || protectedHostViews.includes(view)) {
        setTargetViewForAuth(view);
        setAuthModalOpen(true);
        setMobileMenuOpen(false);
        return;
      }
    }

    setAuthModalOpen(false);
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (target?: string) => {
    setTargetViewForAuth(target);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Heritage Stay Status Banner */}
      <div className="bg-[#2C2C2C] text-[#E5E2D9] text-xs px-4 py-2 border-b border-[#3E3E3E] flex flex-wrap items-center justify-between gap-2 z-40">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C4A484]/20 text-[#E5D7C7] border border-[#C4A484]/40 uppercase tracking-widest">
            Boutique Sanctuary
          </span>
          <span className="hidden sm:inline text-[#A3A094] text-xs">
            Heritage Stay & Hospitality Sanctuary in <strong className="text-[#FDFCF9] font-medium">Gweru, Zimbabwe</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {!currentUser && (
            <button
              onClick={() => navTo('cleaning-login')}
              className="text-[11px] text-[#C4A484] hover:text-white underline underline-offset-2 transition-colors font-medium flex items-center gap-1"
              title="Staff Housekeeping Access"
            >
              <Sparkles className="w-3 h-3" />
              <span>Housekeeping Portal</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#A3A094] hidden md:inline">Account:</span>
            <button
              onClick={() => {
                if (currentUser) {
                  if (role === 'cleaning_staff') {
                    navTo('cleaning-dashboard');
                  } else if (role === 'host') {
                    navTo('admin-dashboard');
                  } else {
                    navTo('guest-dashboard');
                  }
                } else {
                  handleOpenLogin('guest-dashboard');
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                role === 'host'
                  ? 'bg-[#C4A484] text-[#2C2C2C] ring-2 ring-[#C4A484]/30'
                  : role === 'cleaning_staff'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/40'
                  : 'bg-[#5A5A40] text-white ring-2 ring-[#5A5A40]/30'
              }`}
              title="Click to view dashboard or sign in"
            >
              {role === 'host' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Host Access</span>
                </>
              ) : role === 'cleaning_staff' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Housekeeping Staff</span>
                </>
              ) : currentUser ? (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>Guest Portal</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E2D9] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <div
              onClick={() => navTo('landing')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] flex items-center justify-center text-[#FDFCF9] shadow-sm group-hover:scale-105 transition-transform">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="font-serif italic text-2xl font-medium tracking-tight text-[#5A5A40] leading-tight">
                  The Haven
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[#8C887D] font-medium">
                  Heritage Stay & Sanctuary
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {/* Public & Guest Tabs */}
              {(!currentUser || role === 'guest') && (
                <>
                  <button
                    onClick={() => navTo('landing')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors ${
                      currentView === 'landing' || currentView === 'home'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    Overview
                  </button>

                  <button
                    onClick={() => navTo('rooms')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'rooms'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <BedDouble className="w-3.5 h-3.5" />
                    Suites
                  </button>

                  <button
                    onClick={() => navTo('guest-dashboard')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'guest-dashboard'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    My Stay
                  </button>

                  <button
                    onClick={() => navTo('guest-bookings')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'guest-bookings'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Bookings
                  </button>

                  <button
                    onClick={() => navTo('guest-room-service')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'guest-room-service'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    Room Services
                  </button>

                  <button
                    onClick={() => navTo('guest-messages')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'guest-messages'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Concierge Chat
                  </button>
                </>
              )}

              {/* Cleaning Staff Tabs */}
              {role === 'cleaning_staff' && (
                <>
                  <button
                    onClick={() => navTo('landing')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors ${
                      currentView === 'landing' || currentView === 'home'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => navTo('cleaning-dashboard')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      currentView === 'cleaning-dashboard' || currentView === 'cleaning'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Housekeeping Board
                  </button>
                </>
              )}

              {/* Host Admin Tabs */}
              {role === 'host' && (
                <>
                  <button
                    onClick={() => navTo('admin-dashboard')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-dashboard'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <LayoutDashboard className="w-3 h-3" />
                    Dashboard
                  </button>

                  <button
                    onClick={() => navTo('admin-analytics')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-analytics'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Analytics
                  </button>

                  <button
                    onClick={() => navTo('admin-bookings')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-bookings'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <CalendarCheck className="w-3 h-3" />
                    Arrivals
                  </button>

                  <button
                    onClick={() => navTo('admin-cleaning')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-cleaning'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Housekeeping
                  </button>

                  <button
                    onClick={() => navTo('admin-rooms')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-rooms'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <BedDouble className="w-3 h-3" />
                    Suites
                  </button>

                  <button
                    onClick={() => navTo('admin-payments')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-payments'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    Ledger
                  </button>

                  <button
                    onClick={() => navTo('admin-room-service')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-room-service'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <UtensilsCrossed className="w-3 h-3" />
                    Room Services
                  </button>

                  <button
                    onClick={() => navTo('admin-messages')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                      currentView === 'admin-messages'
                        ? 'text-[#5A5A40] bg-[#F5F2ED] border border-[#E5E2D9]'
                        : 'text-[#8C887D] hover:text-[#5A5A40] hover:bg-[#FDFCF9]'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Messages
                  </button>
                </>
              )}
            </nav>

            {/* Notification Bell & Profile Controls */}
            <div className="hidden lg:flex items-center gap-3">
              {/* In-App Notifications Dropdown */}
              <NotificationDropdown onNavigate={(v) => navTo(v)} />

              {currentUser ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (role === 'host') navTo('admin-dashboard');
                      else if (role === 'cleaning_staff') navTo('cleaning-dashboard');
                      else navTo('guest-profile');
                    }}
                    className="flex items-center gap-2.5 p-1 pr-3 rounded-full border border-[#E5E2D9] hover:bg-[#F5F2ED] transition-colors"
                  >
                    <img
                      src={currentUser.profile_image || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'}
                      alt={currentUser.full_name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-2xs"
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-[#2C2C2C] line-clamp-1">
                        {currentUser.full_name}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-[#8C887D] font-bold">
                        {role === 'host' ? 'Host Access' : role === 'cleaning_staff' ? 'Housekeeping' : 'Guest'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      await logout();
                      navTo('landing');
                    }}
                    className="p-2 text-[#8C887D] hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenLogin()}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[#5A5A40] text-white hover:bg-[#474733] transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Controls */}
            <div className="flex lg:hidden items-center gap-2">
              <NotificationDropdown onNavigate={(v) => navTo(v)} />

              <button
                onClick={() => {
                  if (currentUser) {
                    if (role === 'host') navTo('admin-dashboard');
                    else if (role === 'cleaning_staff') navTo('cleaning-dashboard');
                    else navTo('guest-dashboard');
                  } else {
                    handleOpenLogin();
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#5A5A40] text-white"
              >
                {currentUser ? (role === 'host' ? 'Host' : role === 'cleaning_staff' ? 'Staff' : 'Guest') : 'Sign In'}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FDFCF9] border-b border-[#E5E2D9] px-4 pt-2 pb-6 space-y-2">
            <div className="p-3 bg-[#F5F2ED] rounded-2xl mb-3 flex items-center justify-between border border-[#E5E2D9]">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.profile_image || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'}
                    alt={currentUser.full_name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#2C2C2C]">{currentUser.full_name}</div>
                    <div className="text-xs text-[#8C887D]">{currentUser.email}</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenLogin()}
                  className="w-full py-2 text-center text-xs font-bold uppercase tracking-widest bg-[#5A5A40] text-white rounded-full"
                >
                  Sign In / Register
                </button>
              )}
            </div>

            <button
              onClick={() => navTo('landing')}
              className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
            >
              Overview & Property
            </button>
            <button
              onClick={() => navTo('rooms')}
              className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
            >
              Browse Rooms & Suites
            </button>

            {(!currentUser || role === 'guest') && (
              <>
                <button
                  onClick={() => navTo('guest-dashboard')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  My Stay Dashboard
                </button>
                <button
                  onClick={() => navTo('guest-bookings')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Booking History & Payments
                </button>
                <button
                  onClick={() => navTo('guest-room-service')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Room Service Menu & Orders
                </button>
                <button
                  onClick={() => navTo('guest-messages')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Concierge Live Chat
                </button>
                <button
                  onClick={() => navTo('guest-profile')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Profile & Contacts
                </button>
              </>
            )}

            {role === 'cleaning_staff' && (
              <button
                onClick={() => navTo('cleaning-dashboard')}
                className="w-full text-left px-3 py-2 text-sm font-semibold text-[#5A5A40] bg-[#F5F2ED] rounded-xl flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#5A5A40]" />
                <span>Housekeeping Board</span>
              </button>
            )}

            {role === 'host' && (
              <>
                <button
                  onClick={() => navTo('admin-dashboard')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-[#5A5A40] bg-[#F5F2ED] rounded-xl"
                >
                  Host Operations Dashboard
                </button>
                <button
                  onClick={() => navTo('admin-analytics')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Monthly Trends & Revenue Analytics
                </button>
                <button
                  onClick={() => navTo('admin-bookings')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Bookings, Check-in & Check-out
                </button>
                <button
                  onClick={() => navTo('admin-cleaning')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Housekeeping & Cleaning Queue
                </button>
                <button
                  onClick={() => navTo('admin-rooms')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Room Inventory & Pricing
                </button>
                <button
                  onClick={() => navTo('admin-payments')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Payment Ledger & Balances
                </button>
                <button
                  onClick={() => navTo('admin-room-service')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Room Service Kitchen Tickets
                </button>
                <button
                  onClick={() => navTo('admin-messages')}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#2C2C2C] hover:bg-[#F5F2ED] rounded-xl"
                >
                  Guest Messages Inbox
                </button>
              </>
            )}

            {currentUser && (
              <button
                onClick={async () => {
                  await logout();
                  navTo('landing');
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                Sign Out
              </button>
            )}
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setTargetViewForAuth(undefined);
        }}
        targetViewAfterLogin={targetViewForAuth}
        onNavigate={(v) => {
          setAuthModalOpen(false);
          setTargetViewForAuth(undefined);
          navTo(v, true);
        }}
      />
    </>
  );
};
