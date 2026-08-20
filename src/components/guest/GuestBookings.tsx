import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  BedDouble,
  DollarSign,
  Edit,
  XCircle,
  Clock,
  ArrowRight,
  Info,
  Printer,
  CreditCard,
  Star,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Booking } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { ReservationPrintModal } from '../ReservationPrintModal';
import { GuestBookingDetail } from './GuestBookingDetail';
import { PaynowPaymentModal } from '../payment/PaynowPaymentModal';
import { GuestReviewModal } from './GuestReviewModal';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface GuestBookingsProps {
  bookings: Booking[];
  onRefreshBookings: () => void | Promise<any>;
  onBrowseRooms: () => void;
}

export const GuestBookings: React.FC<GuestBookingsProps> = ({
  bookings,
  onRefreshBookings,
  onBrowseRooms
}) => {
  const { success, error } = useToast();
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [modifyingBooking, setModifyingBooking] = useState<Booking | null>(null);
  const [printingBooking, setPrintingBooking] = useState<Booking | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [isModifying, setIsModifying] = useState(false);

  useEffect(() => {
    const handleTabReactivation = () => {
      if (document.visibilityState === 'visible') {
        onRefreshBookings();
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
      await onRefreshBookings();
      success('Booking balances and statuses refreshed from Supabase.');
    } catch (err: any) {
      error('Could not refresh reservations.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (targetBooking && (targetBooking.booking_status === 'checked_in' || targetBooking.booking_status === 'checked_out' || targetBooking.booking_status === 'cancelled')) {
      error(`Cannot cancel a reservation that is already ${targetBooking.booking_status.replace('_', ' ')}.`);
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this booking? This will free up the room for other guests.')) {
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
      success('Booking dates modified and recalculated!');
      setModifyingBooking(null);
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Selected dates conflict with another reservation.');
    } finally {
      setIsModifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] mb-1">
            Guest Reservations
          </div>
          <h1 className="font-serif italic text-3xl font-medium text-[#2C2C2C]">
            My Reservations & Stays
          </h1>
          <p className="text-xs text-[#8C887D] mt-1">
            Review confirmations, settle stay balances via Paynow, or leave reviews on checked-out stays.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#5A5A40] text-xs font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-2 cursor-pointer"
            title="Refresh bookings and balances from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={onBrowseRooms}
            className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors shadow-xs"
          >
            Book Another Room
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-[#FDFCF9] rounded-3xl border border-[#E5E2D9] space-y-3">
          <CalendarCheck className="w-12 h-12 text-[#8C887D] mx-auto" />
          <h3 className="font-serif italic text-xl font-medium text-[#2C2C2C]">No Reservations Found</h3>
          <p className="text-xs text-[#8C887D] max-w-sm mx-auto">
            You don't have any reservations registered yet. Browse our rooms and book a tranquil sanctuary stay.
          </p>
          <button
            onClick={onBrowseRooms}
            className="px-5 py-2.5 bg-[#5A5A40] text-white text-xs font-bold uppercase tracking-wider rounded-full"
          >
            Browse Available Suites
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const nights = Math.max(
              1,
              Math.ceil(
                (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            );
            const balance = Math.max(0, Number(booking.total_amount) - Number(booking.amount_paid));

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-12">
                  {/* Photo Thumbnail */}
                  <div className="md:col-span-4 relative aspect-[16/10] md:aspect-auto bg-stone-900">
                    <ImageWithFallback
                      src={booking.room?.image_url}
                      alt={booking.room?.name || booking.room?.room_type}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-[#2C2C2C]/90 backdrop-blur-md text-[#E5D7C7] text-xs font-semibold px-3 py-1 rounded-full border border-[#C4A484]/30">
                      Room {booking.room?.room_number} &bull; {booking.room?.room_type}
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="md:col-span-8 p-6 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-xs font-bold text-[#8C887D]">
                          Ref #{booking.id.slice(0, 16).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                              booking.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : booking.payment_status === 'partial'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            Payment: {booking.payment_status}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                              booking.booking_status === 'checked_in'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : booking.booking_status === 'confirmed'
                                ? 'bg-[#5A5A40]/15 text-[#5A5A40] border-[#5A5A40]/30'
                                : booking.booking_status === 'checked_out'
                                ? 'bg-stone-100 text-stone-700 border-stone-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            ● {booking.booking_status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-[#E5E2D9] text-xs text-[#2C2C2C]">
                        <div>
                          <div className="text-[#8C887D] font-bold uppercase text-[10px] mb-0.5">Dates</div>
                          <div className="text-[#2C2C2C] font-semibold text-sm">
                            {booking.check_in_date} → {booking.check_out_date}
                          </div>
                          <div className="text-[#8C887D]">{nights} Nights</div>
                        </div>

                        <div>
                          <div className="text-[#8C887D] font-bold uppercase text-[10px] mb-0.5">Guests</div>
                          <div className="text-[#2C2C2C] font-semibold text-sm">
                            {booking.number_of_guests || 1} Registered Guest{(booking.number_of_guests || 1) > 1 ? 's' : ''}
                          </div>
                        </div>

                        <div>
                          <div className="text-[#8C887D] font-bold uppercase text-[10px] mb-0.5">Total / Paid</div>
                          <div className="text-[#2C2C2C] font-semibold text-sm font-serif">
                            ${booking.total_amount}{' '}
                            <span className="text-emerald-700 text-xs font-normal">
                              (${booking.amount_paid} paid)
                            </span>
                          </div>
                          <div className="text-amber-900 font-bold text-xs">
                            Balance: ${balance.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Payment & Billing Summary Callout */}
                      <div className="p-3.5 bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-[#8C887D] block uppercase font-bold">Total Rate</span>
                            <span className="font-serif italic font-bold text-sm text-[#2C2C2C]">${booking.total_amount}</span>
                          </div>
                          <div className="border-l border-[#E5E2D9] pl-4">
                            <span className="text-[10px] text-[#8C887D] block uppercase font-bold">Amount Paid</span>
                            <span className="font-serif italic font-bold text-sm text-emerald-800">${booking.amount_paid}</span>
                          </div>
                          <div className="border-l border-[#E5E2D9] pl-4">
                            <span className="text-[10px] text-[#8C887D] block uppercase font-bold">Balance Due</span>
                            <span className="font-serif italic font-bold text-sm text-[#C4A484]">${balance.toFixed(2)}</span>
                          </div>
                        </div>

                        {Number(booking.amount_paid) < Number(booking.total_amount) && booking.payment_status !== 'paid' && booking.booking_status !== 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => setPaymentBooking(booking)}
                            className="px-4 py-2 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-98 self-start sm:self-auto"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>PAY WITH PAYNOW (${balance.toFixed(2)})</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PAID</span>
                          </div>
                        )}
                      </div>

                      {booking.guest_notes && (
                        <div className="mt-3 text-xs text-[#5A5A40] italic bg-[#F5F2ED] p-2.5 rounded-xl">
                          "{booking.guest_notes}"
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-[#8C887D]">
                        Booked: {new Date(booking.created_at).toLocaleDateString()}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Paynow Payment Button for outstanding balance */}
                        {balance > 0 && booking.payment_status !== 'paid' && booking.booking_status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setPaymentBooking(booking)}
                            className="px-3.5 py-1.5 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>PAY WITH PAYNOW</span>
                          </button>
                        )}

                        {/* Leave Review Button (Strictly for checked_out bookings) */}
                        {booking.booking_status === 'checked_out' && (
                          <button
                            type="button"
                            onClick={() => setReviewBooking(booking)}
                            className="px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Write Review</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedBookingDetail(booking)}
                          className="px-3.5 py-1.5 rounded-full bg-[#5A5A40] text-white hover:bg-[#484833] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          View Details & Voucher
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrintingBooking(booking)}
                          className="px-3.5 py-1.5 rounded-full border border-[#E5E2D9] text-[#2C2C2C] hover:bg-[#F5F2ED] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#5A5A40]" />
                          Print
                        </button>

                        {booking.booking_status !== 'cancelled' && booking.booking_status !== 'checked_out' && booking.booking_status !== 'checked_in' && (
                          <>
                            <button
                              onClick={() => handleOpenModifyModal(booking)}
                              className="px-3.5 py-1.5 rounded-full border border-[#E5E2D9] text-[#2C2C2C] hover:bg-[#F5F2ED] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Modify Dates
                            </button>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="px-3.5 py-1.5 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel Stay
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEDICATED GUEST BOOKING DETAIL WITH PRINT DIALOG */}
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
        onPayWithPaynow={(b) => {
          setSelectedBookingDetail(null);
          setPaymentBooking(b);
        }}
        onLeaveReview={(b) => {
          setSelectedBookingDetail(null);
          setReviewBooking(b);
        }}
      />

      {/* RESERVATION PRINT VOUCHER MODAL */}
      <ReservationPrintModal
        booking={printingBooking}
        isOpen={Boolean(printingBooking)}
        onClose={() => setPrintingBooking(null)}
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

      {/* GUEST REVIEW MODAL */}
      <GuestReviewModal
        booking={reviewBooking}
        isOpen={Boolean(reviewBooking)}
        onClose={() => setReviewBooking(null)}
        onReviewSubmitted={() => {
          onRefreshBookings();
        }}
      />

      {/* MODIFY DATES MODAL */}
      {modifyingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FDFCF9] rounded-[28px] p-6 sm:p-8 max-w-md w-full border border-[#E5E2D9] shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#E5E2D9]">
              <h3 className="font-serif italic text-xl font-medium text-[#2C2C2C]">
                Modify Reservation Dates
              </h3>
              <button
                onClick={() => setModifyingBooking(null)}
                className="text-[#8C887D] hover:text-[#2C2C2C]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5A5A40] leading-relaxed">
              Adjust check-in and check-out dates for <strong>Room {modifyingBooking.room?.room_number}</strong>. Double booking validation will execute immediately.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                  Check-in Date
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
                  Check-out Date
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
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isModifying}
                onClick={handleSaveModifiedDates}
                className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors shadow-xs"
              >
                {isModifying ? 'Saving...' : 'Save New Dates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
