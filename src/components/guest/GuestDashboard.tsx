import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BedDouble,
  DollarSign,
  UtensilsCrossed,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit,
  XCircle,
  Phone,
  ShieldCheck,
  Printer,
  FileText,
  Info,
  CreditCard,
  RefreshCw,
  Check,
  Compass,
  ShoppingBag,
  Building2
} from 'lucide-react';
import { Booking, Room, ServiceOrder } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { GuestBookingDetail } from './GuestBookingDetail';
import { PaynowPaymentModal } from '../payment/PaynowPaymentModal';
import { PaynowServicePaymentModal } from '../payment/PaynowServicePaymentModal';
import { GuestWelcomeLanding } from './GuestWelcomeLanding';

interface GuestDashboardProps {
  bookings: Booking[];
  rooms: Room[];
  onNavigate: (view: string) => void;
  onRefreshBookings: () => void | Promise<any>;
}

export const GuestDashboard: React.FC<GuestDashboardProps> = ({
  bookings,
  rooms,
  onNavigate,
  onRefreshBookings
}) => {
  const { currentUser } = useAuth();
  const { success, error, info } = useToast();

  const [dashboardMode, setDashboardMode] = useState<'welcome_itinerary' | 'reservation_folio'>('welcome_itinerary');
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [payingServiceOrder, setPayingServiceOrder] = useState<ServiceOrder | null>(null);
  const [modifyingBooking, setModifyingBooking] = useState<Booking | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaymentSuccessBanner, setShowPaymentSuccessBanner] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const status = (params.get('status') || params.get('paynow_status') || '').toLowerCase();
    return status === 'complete' || status === 'paid' || status === 'success' || params.has('paynow');
  });

  // Active booking is the most recent confirmed or checked_in booking
  const activeBooking = bookings.find(
    (b) => b.booking_status === 'checked_in' || b.booking_status === 'confirmed'
  ) || bookings[0];

  const pastBookings = bookings.filter((b) => b.id !== activeBooking?.id);

  const fetchGuestServiceOrders = async () => {
    if (!currentUser) return;
    try {
      const orders = await api.getServiceOrders({ guestId: currentUser.id });
      setServiceOrders(orders);
    } catch (err) {
      console.warn('Could not fetch guest service orders:', err);
    }
  };

  useEffect(() => {
    fetchGuestServiceOrders();
  }, [currentUser?.id]);

  // Auto-refresh when tab becomes active or window refocuses (e.g. returning from Paynow tab)
  useEffect(() => {
    const handleTabReactivation = () => {
      if (document.visibilityState === 'visible') {
        onRefreshBookings();
        fetchGuestServiceOrders();
      }
    };

    document.addEventListener('visibilitychange', handleTabReactivation);
    window.addEventListener('focus', handleTabReactivation);

    return () => {
      document.removeEventListener('visibilitychange', handleTabReactivation);
      window.removeEventListener('focus', handleTabReactivation);
    };
  }, [onRefreshBookings]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([onRefreshBookings(), fetchGuestServiceOrders()]);
      success('Reservation data, room tabs, and balances refreshed from Supabase.');
    } catch (err: any) {
      error(err.message || 'Could not refresh booking records.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId) || (activeBooking?.id === bookingId ? activeBooking : null);
    if (targetBooking && (targetBooking.booking_status === 'checked_in' || targetBooking.booking_status === 'checked_out' || targetBooking.booking_status === 'cancelled')) {
      error(`Cannot cancel a reservation that is already ${targetBooking.booking_status.replace('_', ' ')}.`);
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this booking? You can re-book anytime.')) {
      return;
    }
    try {
      await api.cancelBooking(bookingId);
      success('Booking cancelled successfully.');
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Failed to cancel booking.');
    }
  };

  const handleOpenModifyModal = (booking: Booking) => {
    if (booking.booking_status === 'checked_in' || booking.booking_status === 'checked_out' || booking.booking_status === 'cancelled') {
      error(`Dates cannot be modified once the reservation is ${booking.booking_status.replace('_', ' ')}. Please contact the host for assistance.`);
      return;
    }
    setModifyingBooking(booking);
    setNewCheckIn(booking.check_in_date);
    setNewCheckOut(booking.check_out_date);
  };

  const handleSaveModifiedDates = async () => {
    if (!modifyingBooking) return;
    if (modifyingBooking.booking_status === 'checked_in' || modifyingBooking.booking_status === 'checked_out' || modifyingBooking.booking_status === 'cancelled') {
      error(`Dates cannot be modified once the reservation is ${modifyingBooking.booking_status.replace('_', ' ')}.`);
      setModifyingBooking(null);
      return;
    }
    if (new Date(newCheckOut) <= new Date(newCheckIn)) {
      error('Check-out date must be after check-in date.');
      return;
    }

    setIsModifying(true);
    try {
      await api.updateBookingDates(modifyingBooking.id, newCheckIn, newCheckOut);
      success('Booking dates updated successfully!');
      setModifyingBooking(null);
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Failed to update dates. Conflict with existing reservation.');
    } finally {
      setIsModifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* POST-PAYMENT RETURN CONFIRMATION BANNER */}
      {showPaymentSuccessBanner && (
        <div className="bg-emerald-900/90 text-white rounded-3xl p-5 sm:p-6 border border-emerald-700 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <span>Paynow Zimbabwe Reconciliation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Supabase Live Sync</span>
              </div>
              <h3 className="font-serif italic text-lg sm:text-xl font-medium text-white mt-0.5">
                Payment Received & Reconciled
              </h3>
              <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed mt-1">
                Your transaction has been confirmed. Booking records, remaining balances, and room availability are synchronized with Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-emerald-600/60 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <button
              onClick={() => setShowPaymentSuccessBanner(false)}
              className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* TOP DASHBOARD MODE CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#E5E2D9]">
        <div className="flex items-center gap-2 bg-[#F5F2ED] p-1.5 rounded-full border border-[#E5E2D9]">
          <button
            onClick={() => setDashboardMode('welcome_itinerary')}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              dashboardMode === 'welcome_itinerary'
                ? 'bg-[#5A5A40] text-white shadow-xs'
                : 'text-[#8C887D] hover:text-[#2C2C2C]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome & Itinerary Portal</span>
          </button>

          <button
            onClick={() => setDashboardMode('reservation_folio')}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              dashboardMode === 'reservation_folio'
                ? 'bg-[#5A5A40] text-white shadow-xs'
                : 'text-[#8C887D] hover:text-[#2C2C2C]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reservation Folio & Billing</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Sync reservation status with Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5A5A40] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Supabase Data'}</span>
          </button>
        </div>
      </div>

      {/* MODE 1: WELCOME & ITINERARY LANDING VIEW */}
      {dashboardMode === 'welcome_itinerary' && (
        <GuestWelcomeLanding
          bookings={bookings}
          rooms={rooms}
          onNavigate={onNavigate}
          onRefreshBookings={onRefreshBookings}
          onSelectBookingDetail={(b) => setSelectedBookingDetail(b)}
          onOpenModifyModal={(b) => handleOpenModifyModal(b)}
          onOpenPaymentModal={(b) => setPaymentBooking(b)}
        />
      )}

      {/* MODE 2: RESERVATION FOLIO & DETAILED BILLING VIEW */}
      {dashboardMode === 'reservation_folio' && (
        <div className="space-y-8 animate-fadeIn">
          {/* ACTIVE STAY SECTION */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif italic text-2xl text-[#5A5A40] font-medium">
                Active Reservation
              </h2>
              {activeBooking && (
                <span className="text-[10px] font-mono text-[#8C887D]">
                  Ref #{activeBooking.id}
                </span>
              )}
            </div>

            {activeBooking ? (
              <div className="bg-white rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* Left Photo & Quick Info */}
                  <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto bg-[#2C2C2C]">
                    <img
                      src={activeBooking.room?.image_url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'}
                      alt={activeBooking.room?.room_type}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2C2C2C]/90 text-[#E5D7C7] backdrop-blur-md border border-white/10 shadow-xs">
                        Room {activeBooking.room?.room_number} • {activeBooking.room?.room_type}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                        activeBooking.booking_status === 'checked_in'
                          ? 'bg-[#5A5A40] text-white'
                          : 'bg-[#C4A484] text-[#2C2C2C]'
                      }`}>
                        {activeBooking.booking_status === 'checked_in' ? 'Currently Checked In' : 'Confirmed Upcoming Stay'}
                      </span>
                    </div>
                  </div>

                  {/* Right Stay Details */}
                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-6 border-b border-[#F5F2ED]">
                        <div>
                          <div className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">Check-in</div>
                          <div className="text-xs font-semibold text-[#2C2C2C] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                            {activeBooking.check_in_date}
                          </div>
                          {activeBooking.actual_check_in && (
                            <div className="text-[10px] text-[#5A5A40] mt-1">
                              Clocked: {new Date(activeBooking.actual_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">Check-out</div>
                          <div className="text-xs font-semibold text-[#2C2C2C] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                            {activeBooking.check_out_date}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">Guests</div>
                          <div className="text-xs font-semibold text-[#2C2C2C]">
                            {activeBooking.number_of_guests || 1} Guests
                          </div>
                        </div>
                      </div>

                      {/* Payment Breakdown */}
                      <div className="py-6 space-y-4 border-b border-[#F5F2ED]">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                            Payment & Billing Summary
                          </div>
                          <button
                            type="button"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            title="Reconcile balance with Supabase in real time"
                          >
                            <RefreshCw className={`w-3 h-3 text-[#5A5A40] ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>{isRefreshing ? 'Syncing...' : 'Sync Balance'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-[#FDFCF9] p-4 rounded-2xl border border-[#E5E2D9] text-center">
                          <div>
                            <div className="text-[10px] text-[#8C887D]">Total Rate</div>
                            <div className="text-base font-serif italic font-bold text-[#2C2C2C]">
                              ${activeBooking.total_amount}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#8C887D]">Amount Paid</div>
                            <div className="text-base font-serif italic font-bold text-[#5A5A40]">
                              ${activeBooking.amount_paid}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#8C887D]">Balance Due</div>
                            <div className="text-base font-serif italic font-bold text-[#C4A484]">
                              ${(Number(activeBooking.total_amount) - Number(activeBooking.amount_paid)).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#8C887D] pt-1">
                          <span>Payment Status:</span>
                          <span className={`capitalize font-bold text-[10px] tracking-wide ${
                            activeBooking.payment_status === 'paid'
                              ? 'text-[#5A5A40]'
                              : activeBooking.payment_status === 'partial'
                              ? 'text-[#C4A484]'
                              : 'text-[#8C887D]'
                          }`}>
                            ● {activeBooking.payment_status}
                          </span>
                        </div>

                        {/* PAY WITH PAYNOW BUTTON */}
                        {Number(activeBooking.amount_paid) < Number(activeBooking.total_amount) && activeBooking.payment_status !== 'paid' ? (
                          <div className="pt-2">
                            <button
                              id="pay-with-paynow-active-booking"
                              type="button"
                              onClick={() => setPaymentBooking(activeBooking)}
                              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-98"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>PAY WITH PAYNOW (${(Number(activeBooking.total_amount) - Number(activeBooking.amount_paid)).toFixed(2)})</span>
                            </button>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>PAID (Fully Settled)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Management Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {Number(activeBooking.amount_paid) < Number(activeBooking.total_amount) && activeBooking.payment_status !== 'paid' && activeBooking.booking_status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setPaymentBooking(activeBooking)}
                            className="px-4 py-2 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>PAY WITH PAYNOW</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedBookingDetail(activeBooking)}
                          className="px-4 py-2 rounded-full bg-[#5A5A40] text-white hover:bg-[#484833] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          View Details & Print
                        </button>
                        {activeBooking.booking_status !== 'checked_in' && activeBooking.booking_status !== 'checked_out' && activeBooking.booking_status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleOpenModifyModal(activeBooking)}
                              className="px-4 py-2 rounded-full border border-[#E5E2D9] text-[#2C2C2C] hover:bg-[#FDFCF9] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-[#5A5A40]" />
                              Modify Dates
                            </button>
                            <button
                              onClick={() => handleCancelBooking(activeBooking.id)}
                              className="px-4 py-2 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel Stay
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate('guest-room-service')}
                          className="px-5 py-2 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-[10px] font-bold uppercase tracking-widest transition-colors shadow-2xs cursor-pointer"
                        >
                          Room Service Menu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-[#E5E2D9] text-center space-y-4 shadow-2xs">
                <BedDouble className="w-10 h-10 text-[#8C887D] mx-auto" />
                <h3 className="font-serif italic text-xl font-medium text-[#2C2C2C]">
                  No Active Reservation
                </h3>
                <p className="text-xs text-[#8C887D] max-w-sm mx-auto leading-relaxed">
                  You do not have an active stay scheduled right now. Browse our available suites and book your sanctuary.
                </p>
                <div>
                  <button
                    onClick={() => onNavigate('rooms')}
                    className="px-6 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-colors shadow-xs cursor-pointer"
                  >
                    Browse Rooms & Suites
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ROOM TAB / CURRENT STAY CHARGES SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif italic text-xl text-[#5A5A40] font-medium flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-[#5A5A40]" />
                  <span>Room Tab & Incidental Charges</span>
                </h2>
                <p className="text-xs text-[#8C887D] mt-0.5">
                  Itemized food, beverages, and laundry services ordered during your stay.
                </p>
              </div>
              <button
                onClick={() => onNavigate('guest-room-service')}
                className="px-4 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <UtensilsCrossed className="w-3 h-3" />
                <span>Order Room Service</span>
              </button>
            </div>

            {/* Comprehensive Stay Folio Breakdown Card */}
            {activeBooking && (
              <div className="bg-[#FDFCF9] rounded-3xl p-6 border border-[#E5E2D9] shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-3">
                  Comprehensive Stay Folio Balance
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-[#E5E2D9] text-center">
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E5E2D9]/70">
                    <div className="text-[10px] text-[#8C887D] font-bold uppercase tracking-wider">Accommodation</div>
                    <div className="text-sm sm:text-base font-serif italic font-bold text-[#2C2C2C] mt-1">
                      ${Number(activeBooking.total_amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E5E2D9]/70">
                    <div className="text-[10px] text-[#8C887D] font-bold uppercase tracking-wider">Room Services & Laundry</div>
                    <div className="text-sm sm:text-base font-serif italic font-bold text-[#2C2C2C] mt-1">
                      ${serviceOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total_amount || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E5E2D9]/70">
                    <div className="text-[10px] text-[#5A5A40] font-bold uppercase tracking-wider">Total Paid</div>
                    <div className="text-sm sm:text-base font-serif italic font-bold text-[#5A5A40] mt-1">
                      ${(
                        Number(activeBooking.amount_paid || 0) +
                        serviceOrders
                          .filter((o) => o.status !== 'cancelled')
                          .reduce((sum, o) => sum + (o.payment_status === 'paid' ? Number(o.total_amount || 0) : Number(o.amount_paid || 0)), 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E5E2D9]/70">
                    <div className="text-[10px] text-[#C4A484] font-bold uppercase tracking-wider">Total Balance Due</div>
                    <div className="text-sm sm:text-base font-serif italic font-bold text-[#C4A484] mt-1">
                      ${Math.max(
                        0,
                        (Number(activeBooking.total_amount || 0) - Number(activeBooking.amount_paid || 0)) +
                        serviceOrders
                          .filter((o) => o.status !== 'cancelled' && o.payment_status !== 'paid')
                          .reduce((sum, o) => sum + (Number(o.total_amount || 0) - Number(o.amount_paid || 0)), 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Orders Table */}
            {serviceOrders.length > 0 ? (
              <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-widest border-b border-[#E5E2D9]">
                      <tr>
                        <th className="px-6 py-3.5">Service / Items</th>
                        <th className="px-6 py-3.5">Quantity & Unit</th>
                        <th className="px-6 py-3.5">Total Charge</th>
                        <th className="px-6 py-3.5">Order Status</th>
                        <th className="px-6 py-3.5">Payment Status</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED] text-[#2C2C2C]">
                      {serviceOrders.map((order) => {
                        const isLaundry = order.items?.some(
                          (it) => it.menu_item?.name?.toLowerCase().includes('laundry') || it.menu_item?.category?.toLowerCase().includes('laundry')
                        );
                        const isPaid = order.payment_status === 'paid';

                        return (
                          <tr key={order.id} className="hover:bg-[#FDFCF9]">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-[#2C2C2C]">
                                {order.items && order.items.length > 0
                                  ? order.items.map((it) => it.menu_item?.name || 'Item').join(', ')
                                  : isLaundry ? 'Laundry Service' : 'Room Service Meal'}
                              </div>
                              <div className="text-[10px] text-[#8C887D] mt-0.5">
                                {new Date(order.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#8C887D]">
                              {order.items && order.items.length > 0 ? (
                                order.items.map((it, idx) => (
                                  <div key={idx} className="text-xs">
                                    {it.quantity} × ${Number(it.unit_price).toFixed(2)}
                                  </div>
                                ))
                              ) : (
                                <span>1 item</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-[#2C2C2C]">
                              ${Number(order.total_amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : order.status === 'preparing'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : order.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                                order.status === 'cancelled' || order.payment_status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : order.payment_status === 'room_tab'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : order.payment_status === 'pending'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {order.status === 'cancelled' || order.payment_status === 'cancelled'
                                  ? 'Cancelled'
                                  : order.payment_status === 'room_tab'
                                  ? 'Room Tab'
                                  : order.payment_status === 'paid'
                                  ? 'Paid'
                                  : order.payment_status === 'pending'
                                  ? 'Pending'
                                  : 'Unpaid'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {order.status === 'cancelled' || order.payment_status === 'cancelled' ? (
                                <span className="text-[10px] text-[#8C887D] font-bold uppercase tracking-wider">
                                  Cancelled
                                </span>
                              ) : !isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => setPayingServiceOrder(order)}
                                  className="px-3.5 py-1.5 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-98"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Now (${Number(order.total_amount).toFixed(2)})</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" /> Settled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-[#E5E2D9] text-center space-y-3 shadow-2xs">
                <UtensilsCrossed className="w-8 h-8 text-[#8C887D] mx-auto opacity-70" />
                <div className="text-xs font-semibold text-[#2C2C2C]">No Room Service Orders Yet</div>
                <p className="text-[11px] text-[#8C887D] max-w-sm mx-auto">
                  Order chef-crafted meals, refreshing beverages, or express laundry delivered straight to your suite.
                </p>
                <div>
                  <button
                    onClick={() => onNavigate('guest-room-service')}
                    className="px-5 py-2 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-widest transition-colors shadow-2xs cursor-pointer"
                  >
                    View Room Service Menu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BOOKING HISTORY TABLE */}
          {pastBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-serif italic text-xl text-[#5A5A40] font-medium">
                Booking History & Prior Stays
              </h2>

              <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-widest border-b border-[#E5E2D9]">
                      <tr>
                        <th className="px-6 py-3.5">Booking Ref</th>
                        <th className="px-6 py-3.5">Room</th>
                        <th className="px-6 py-3.5">Dates</th>
                        <th className="px-6 py-3.5">Total Amount</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F2ED] text-[#2C2C2C]">
                      {pastBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#FDFCF9]">
                          <td className="px-6 py-4 font-mono font-medium text-[#2C2C2C]">{b.id}</td>
                          <td className="px-6 py-4">
                            Room {b.room?.room_number || b.room_id} ({b.room?.room_type})
                          </td>
                          <td className="px-6 py-4 text-[#8C887D]">
                            {b.check_in_date} → {b.check_out_date}
                          </td>
                          <td className="px-6 py-4 font-bold text-[#2C2C2C]">${b.total_amount}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                              b.booking_status === 'checked_out'
                                ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                                : b.booking_status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                            }`}>
                              {b.booking_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedBookingDetail(b)}
                              className="px-3 py-1 bg-white hover:bg-[#F5F2ED] border border-[#E5E2D9] rounded-full text-[10px] font-bold uppercase tracking-wider text-[#5A5A40] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              View / Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEDICATED GUEST BOOKING DETAIL PRINT VIEW */}
      <GuestBookingDetail
        booking={selectedBookingDetail}
        isOpen={Boolean(selectedBookingDetail)}
        onClose={() => setSelectedBookingDetail(null)}
        onModifyDates={(b) => {
          setSelectedBookingDetail(null);
          handleOpenModifyModal(b);
        }}
        onCancelBooking={(id) => {
          setSelectedBookingDetail(null);
          handleCancelBooking(id);
        }}
        onOrderRoomService={() => {
          setSelectedBookingDetail(null);
          onNavigate('guest-room-service');
        }}
        onMessageHost={() => {
          setSelectedBookingDetail(null);
          onNavigate('guest-messages');
        }}
        onPayWithPaynow={(b) => {
          setSelectedBookingDetail(null);
          setPaymentBooking(b);
        }}
      />

      {/* PAYNOW PAYMENT MODAL */}
      {paymentBooking && (
        <PaynowPaymentModal
          booking={paymentBooking}
          isOpen={Boolean(paymentBooking)}
          onClose={() => setPaymentBooking(null)}
          onPaymentSuccess={() => {
            onRefreshBookings();
          }}
        />
      )}

      {/* PAYNOW SERVICE PAYMENT MODAL */}
      {payingServiceOrder && (
        <PaynowServicePaymentModal
          order={payingServiceOrder}
          isOpen={Boolean(payingServiceOrder)}
          onClose={() => setPayingServiceOrder(null)}
          onPaymentSuccess={() => {
            setPayingServiceOrder(null);
            handleManualRefresh();
          }}
        />
      )}

      {/* MODIFY DATES MODAL */}
      {modifyingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FDFCF9] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E5E2D9] shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#E5E2D9]">
              <h3 className="font-serif italic text-xl font-medium text-[#2C2C2C]">
                Modify Booking Dates
              </h3>
              <button
                onClick={() => setModifyingBooking(null)}
                className="text-[#8C887D] hover:text-[#2C2C2C]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8C887D] leading-relaxed">
              Updating dates for <strong>Room {modifyingBooking.room?.room_number}</strong>. Availability will be re-validated automatically.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  New Check-in Date
                </label>
                <input
                  type="date"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  New Check-out Date
                </label>
                <input
                  type="date"
                  min={newCheckIn}
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
              <button
                type="button"
                onClick={() => setModifyingBooking(null)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isModifying}
                onClick={handleSaveModifiedDates}
                className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs"
              >
                {isModifying ? 'Validating...' : 'Update Dates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
