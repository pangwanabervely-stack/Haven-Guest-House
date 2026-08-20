import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { RoomsCatalog } from './components/RoomsCatalog';
import { RoomDetailModal } from './components/RoomDetailModal';
import { BookingModal } from './components/BookingModal';
import { AuthModal } from './components/auth/AuthModal';

// Guest Views
import { GuestDashboard } from './components/guest/GuestDashboard';
import { GuestBookings } from './components/guest/GuestBookings';
import { GuestRoomService } from './components/guest/GuestRoomService';
import { GuestMessages } from './components/guest/GuestMessages';
import { GuestProfile } from './components/guest/GuestProfile';

// Host Views
import { HostDashboard } from './components/admin/HostDashboard';
import { HostBookings } from './components/admin/HostBookings';
import { HostRooms } from './components/admin/HostRooms';
import { HostCleaning } from './components/admin/HostCleaning';
import { HostPayments } from './components/admin/HostPayments';
import { HostRoomService } from './components/admin/HostRoomService';
import { HostMessages } from './components/admin/HostMessages';
import { HostSystemTools } from './components/admin/HostSystemTools';
import { HostVisualizations } from './components/admin/HostVisualizations';

// Cleaning Staff Views
import { CleaningStaffLogin } from './components/cleaning/CleaningStaffLogin';
import { CleaningDashboard } from './components/cleaning/CleaningDashboard';

import { Room, Booking, FeaturedOffer } from './types';
import { api } from './lib/api';

function MainApp() {
  const { currentUser, isHost, isCleaningStaff } = useAuth();
  const { success, error, info } = useToast();
  const { addNotification } = useNotifications();

  const [currentView, setCurrentView] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'home';
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Booking Modal preset params & offer context
  const [bookingCheckIn, setBookingCheckIn] = useState<string>('');
  const [bookingCheckOut, setBookingCheckOut] = useState<string>('');
  const [bookingGuests, setBookingGuests] = useState<number>(1);
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<FeaturedOffer | null>(null);

  const fetchAppData = useCallback(async () => {
    try {
      const [fetchedRooms, fetchedBookings] = await Promise.all([
        api.getRooms(),
        currentUser && !isCleaningStaff
          ? api.getBookings(isHost ? undefined : { guestId: currentUser.id })
          : isCleaningStaff
          ? Promise.resolve([])
          : api.getBookings()
      ]);
      setRooms(fetchedRooms);
      setBookings(fetchedBookings);
      return { rooms: fetchedRooms, bookings: fetchedBookings };
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      return null;
    }
  }, [currentUser?.id, isHost, isCleaningStaff]);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  // Automated Post-Payment Return Flow Hook from Paynow Redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = (params.get('status') || params.get('paynow_status') || '').toLowerCase();
    const hasPaynowFlag =
      statusParam === 'complete' ||
      statusParam === 'paid' ||
      statusParam === 'success' ||
      params.has('paynow') ||
      params.has('paynow_return');

    if (hasPaynowFlag) {
      console.log('[Paynow Return Detected]: Triggering automatic app data refresh from Supabase...');

      // Retrieve any pending transaction metadata stored prior to redirect
      let pendingTxn: any = null;
      try {
        const stored = sessionStorage.getItem('pending_paynow_transaction');
        if (stored) {
          pendingTxn = JSON.parse(stored);
        }
      } catch {
        // Non-blocking
      }

      const bookingIdParam = params.get('booking_id') || params.get('bookingId') || pendingTxn?.bookingId;
      const refParam = params.get('ref') || params.get('reference') || pendingTxn?.reference;

      const performPostPaymentSync = async () => {
        // 1. First immediate data fetch from Supabase
        await fetchAppData();

        // 2. Poll/confirm status against server to ensure background reconciliation is authoritatively recorded
        if (refParam || bookingIdParam) {
          try {
            await api.pollPaynowStatus({
              reference: refParam,
              pollUrl: pendingTxn?.pollUrl,
              bookingId: bookingIdParam
            });
          } catch (pollErr) {
            console.warn('[Post-Payment Status Poll Note]:', pollErr);
          }
        }

        // 3. Second staggered data fetch to catch real-time Supabase updates
        setTimeout(async () => {
          await fetchAppData();
        }, 1200);

        success('Paynow payment processed! Reservation balances and payment status updated from Supabase.');
        addNotification({
          title: 'Payment Synchronized',
          message: 'Your stay balance and payment status have been updated in real-time from Supabase.',
          type: 'payment',
          linkView: 'guest-dashboard'
        });

        try {
          sessionStorage.removeItem('pending_paynow_transaction');
        } catch {
          // Non-blocking
        }
      };

      performPostPaymentSync();

      // Navigate to guest dashboard if guest
      if (currentUser?.role === 'guest' || !currentUser) {
        const requestedView = params.get('view');
        if (requestedView === 'guest-bookings') {
          setCurrentView('guest-bookings');
        } else {
          setCurrentView('guest-dashboard');
        }
      }

      // Clean up URL parameters cleanly
      const targetPath = window.location.pathname;
      const targetQuery = currentUser?.role === 'guest' ? '?view=guest-dashboard' : '';
      window.history.replaceState({}, document.title, targetPath + targetQuery);
    }
  }, [fetchAppData, currentUser, success, addNotification]);

  // Handle switching views and strictly enforcing role boundaries
  useEffect(() => {
    if (!currentUser) {
      // Unauthenticated user: restrict protected portals
      if (
        currentView.startsWith('admin-') ||
        currentView === 'guest-dashboard' ||
        currentView === 'guest-bookings' ||
        currentView === 'guest-room-service' ||
        currentView === 'guest-messages' ||
        currentView === 'guest-profile' ||
        currentView === 'cleaning-dashboard' ||
        currentView === 'cleaning'
      ) {
        setCurrentView('landing');
      }
      return;
    }

    switch (currentUser.role) {
      case 'host':
        // Host has access to admin dashboard and views
        if (
          currentView === 'guest-dashboard' ||
          currentView === 'guest-bookings' ||
          currentView === 'guest-room-service' ||
          currentView === 'guest-messages' ||
          currentView === 'guest-profile' ||
          currentView === 'cleaning-dashboard' ||
          currentView === 'cleaning' ||
          currentView === 'cleaning-login'
        ) {
          setCurrentView('admin-dashboard');
        }
        break;

      case 'cleaning_staff':
        // Cleaning staff is strictly restricted to Housekeeping portal
        if (currentView !== 'cleaning-dashboard' && currentView !== 'cleaning-login' && currentView !== 'cleaning') {
          setCurrentView('cleaning-dashboard');
        }
        break;

      case 'guest':
        // Guests cannot access host dashboard or housekeeping portal
        if (
          currentView.startsWith('admin-') ||
          currentView === 'cleaning-dashboard' ||
          currentView === 'cleaning' ||
          currentView === 'cleaning-login'
        ) {
          setCurrentView('guest-dashboard');
        }
        break;

      default:
        // Safely deny access to unrecognized roles
        setCurrentView('landing');
        break;
    }
  }, [currentUser, currentView]);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsDetailModalOpen(true);
  };

  const handleBookFromDetail = (room: Room, checkIn: string, checkOut: string, guests: number) => {
    setIsDetailModalOpen(false);
    setSelectedRoom(room);
    setBookingCheckIn(checkIn);
    setBookingCheckOut(checkOut);
    setBookingGuests(guests);
    setIsBookingModalOpen(true);
  };

  const handleDirectBook = (room: Room) => {
    setSelectedRoom(room);
    setSelectedOffer(null);
    setSelectedPromoCode('');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    setBookingCheckIn(today);
    setBookingCheckOut(tomorrow.toISOString().split('T')[0]);
    setBookingGuests(1);
    setIsBookingModalOpen(true);
  };

  const handleClaimOffer = (offer: FeaturedOffer, targetRoom?: Room) => {
    setSelectedOffer(offer);
    setSelectedPromoCode(offer.promoCode);
    const chosenRoom = targetRoom || (rooms.length > 0 ? rooms[0] : null);
    if (chosenRoom) {
      setSelectedRoom(chosenRoom);
      const today = new Date().toISOString().split('T')[0];
      const minNights = offer.minNights || 2;
      const checkoutDate = new Date();
      checkoutDate.setDate(checkoutDate.getDate() + minNights);
      setBookingCheckIn(today);
      setBookingCheckOut(checkoutDate.toISOString().split('T')[0]);
      setBookingGuests(1);
      setIsBookingModalOpen(true);
    } else {
      setCurrentView('rooms');
    }
  };

  const handleBookingSuccess = (newBooking: Booking) => {
    fetchAppData();
    setCurrentView(isHost ? 'admin-bookings' : 'guest-dashboard');
  };

  const userActiveBooking = bookings.find(
    (b) => b.guest_id === currentUser?.id && (b.booking_status === 'checked_in' || b.booking_status === 'confirmed')
  );

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      {/* Primary Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Routed View Container */}
      <main className="flex-1">
        {(currentView === 'home' || currentView === 'landing') && (
          <LandingPage
            rooms={rooms}
            onSelectRoom={handleSelectRoom}
            onExploreRooms={() => setCurrentView('rooms')}
            onBookDirect={() => setCurrentView('rooms')}
            onClaimOffer={handleClaimOffer}
            onCleaningStaffLogin={() => setCurrentView('cleaning-login')}
          />
        )}

        {currentView === 'rooms' && (
          <RoomsCatalog
            rooms={rooms}
            onSelectRoom={handleSelectRoom}
            onBookRoomDirect={handleDirectBook}
          />
        )}

        {/* GUEST PORTAL VIEWS */}
        {currentView === 'guest-dashboard' && (
          <GuestDashboard
            bookings={bookings.filter((b) => b.guest_id === currentUser?.id)}
            rooms={rooms}
            onNavigate={(view) => setCurrentView(view)}
            onRefreshBookings={fetchAppData}
          />
        )}

        {currentView === 'guest-bookings' && (
          <GuestBookings
            bookings={bookings.filter((b) => b.guest_id === currentUser?.id)}
            onRefreshBookings={fetchAppData}
            onBrowseRooms={() => setCurrentView('rooms')}
          />
        )}

        {currentView === 'guest-room-service' && (
          <GuestRoomService activeBooking={userActiveBooking} />
        )}

        {currentView === 'guest-messages' && (
          <GuestMessages activeBooking={userActiveBooking} />
        )}

        {currentView === 'guest-profile' && (
          <GuestProfile bookings={bookings.filter((b) => b.guest_id === currentUser?.id)} />
        )}

        {/* HOST / ADMIN PORTAL VIEWS */}
        {currentView === 'admin-dashboard' && (
          <HostDashboard
            onNavigate={(view) => setCurrentView(view)}
            onRefreshAll={fetchAppData}
          />
        )}

        {currentView === 'admin-analytics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="border-b border-[#E5E2D9] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
                  Executive Intelligence & Revenue Analytics
                </div>
                <h1 className="font-serif italic text-3xl sm:text-4xl text-[#5A5A40] font-medium">
                  Monthly Trends & Financial Growth
                </h1>
                <p className="text-[#8C887D] text-sm mt-1">
                  Interactive charts measuring monthly booking cadence, gross revenue expansion, cash realization, and suite performance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('admin-dashboard')}
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#F5F2ED] text-[#5A5A40] text-xs font-bold uppercase tracking-wider border border-[#E5E2D9] transition-colors"
                >
                  ← Operations Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('admin-payments')}
                  className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  Payment Ledger →
                </button>
              </div>
            </div>

            <HostVisualizations
              bookings={bookings}
              rooms={rooms}
              onRefresh={fetchAppData}
            />
          </div>
        )}

        {currentView === 'admin-bookings' && (
          <HostBookings
            bookings={bookings}
            onRefreshBookings={fetchAppData}
          />
        )}

        {currentView === 'admin-rooms' && (
          <HostRooms
            rooms={rooms}
            onRefreshRooms={fetchAppData}
          />
        )}

        {currentView === 'admin-cleaning' && (
          <HostCleaning
            rooms={rooms}
            onRefreshRooms={fetchAppData}
          />
        )}

        {currentView === 'admin-payments' && (
          <HostPayments
            bookings={bookings}
            onRefreshBookings={fetchAppData}
          />
        )}

        {currentView === 'admin-room-service' && (
          <HostRoomService />
        )}

        {currentView === 'admin-messages' && (
          <HostMessages bookings={bookings} />
        )}

        {currentView === 'admin-system-tools' && (
          <HostSystemTools onDatabaseReset={fetchAppData} />
        )}

        {/* HOUSEKEEPING / CLEANING STAFF PORTAL VIEWS */}
        {currentView === 'cleaning-login' && (
          <CleaningStaffLogin
            onLoginSuccess={() => setCurrentView('cleaning-dashboard')}
            onBack={() => setCurrentView('landing')}
          />
        )}

        {(currentView === 'cleaning-dashboard' || currentView === 'cleaning') && (
          <CleaningDashboard
            rooms={rooms}
            onRefreshRooms={fetchAppData}
            onLogout={() => setCurrentView('landing')}
          />
        )}
      </main>

      {/* MODALS */}
      <RoomDetailModal
        room={selectedRoom}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onBook={handleBookFromDetail}
      />

      <BookingModal
        room={selectedRoom}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedOffer(null);
          setSelectedPromoCode('');
        }}
        initialCheckIn={bookingCheckIn}
        initialCheckOut={bookingCheckOut}
        initialGuests={bookingGuests}
        initialPromoCode={selectedPromoCode}
        initialOffer={selectedOffer}
        onBookingSuccess={handleBookingSuccess}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onNavigate={(view) => setCurrentView(view)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
