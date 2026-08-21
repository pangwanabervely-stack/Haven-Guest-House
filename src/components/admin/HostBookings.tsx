import React, { useState } from 'react';
import {
  Search,
  Filter,
  LogIn,
  LogOut,
  CreditCard,
  XCircle,
  Clock,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Phone
} from 'lucide-react';
import { Booking } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { useNotifications } from '../../context/NotificationContext';

interface HostBookingsProps {
  bookings: Booking[];
  onRefreshBookings: () => void;
}

export const HostBookings: React.FC<HostBookingsProps> = ({
  bookings,
  onRefreshBookings
}) => {
  const { success, error } = useToast();
  const { notifyCheckout, notifyPaymentReceived } = useNotifications();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Recording Modal State
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'bank_transfer'>('credit_card');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const statuses = ['All', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'All' && b.booking_status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.guest?.full_name.toLowerCase().includes(q);
      const matchEmail = b.guest?.email.toLowerCase().includes(q);
      const matchRef = b.id.toLowerCase().includes(q);
      const matchRoom = b.room?.room_number.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRef && !matchRoom) {
        return false;
      }
    }
    return true;
  });

  const handleCheckIn = async (bookingId: string) => {
    try {
      await api.checkInGuest(bookingId);
      success('Guest checked in! Room marked as occupied.');
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Check-in failed.');
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    try {
      await api.checkOutGuest(bookingId);
      if (booking) {
        notifyCheckout({
          bookingId: booking.id,
          guestId: booking.guest_id,
          guestName: booking.guest?.full_name || 'Guest',
          roomNumber: booking.room?.room_number || 'Room',
          roomId: booking.room_id
        });
      }
      success('Guest checked out! Room sent to Housekeeping dirty queue.');
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Check-out failed.');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.cancelBooking(bookingId);
      success('Booking cancelled.');
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Cancellation failed.');
    }
  };

  const handleOpenPaymentModal = (booking: Booking) => {
    setPaymentBooking(booking);
    const balance = Math.max(0, booking.total_amount - booking.amount_paid);
    setPaymentAmount(balance);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBooking) return;

    setIsProcessingPayment(true);
    try {
      const newTotalPaid = paymentBooking.amount_paid + Number(paymentAmount);
      await api.updateBookingPayment(paymentBooking.id, newTotalPaid, paymentMethod);
      notifyPaymentReceived({
        guestId: paymentBooking.guest_id,
        guestName: paymentBooking.guest?.full_name || 'Guest',
        amount: Number(paymentAmount),
        bookingId: paymentBooking.id,
        roomNumber: paymentBooking.room?.room_number || 'Room'
      });
      success(`Recorded payment of $${paymentAmount} via ${paymentMethod}!`);
      setPaymentBooking(null);
      onRefreshBookings();
    } catch (err: any) {
      error(err.message || 'Payment recording failed.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2D9] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#C4A484] mb-1">
            Master Stays Register
          </div>
          <h1 className="font-serif italic text-3xl font-normal text-[#5A5A40]">
            Booking & Reservation Management
          </h1>
          <p className="text-[#8C887D] text-xs mt-1">
            Perform guest check-ins, check-outs, record on-site payments, and review stay records.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C887D] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by guest, room #, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-full focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                statusFilter === status
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                  : 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9] hover:text-[#2C2C2C]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-[#E5E2D9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2ED] text-[#8C887D] text-[10px] font-bold uppercase tracking-widest border-b border-[#E5E2D9]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Ref & Guest</th>
                <th className="px-6 py-3.5 font-bold">Room</th>
                <th className="px-6 py-3.5 font-bold">Stay Dates</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Financials</th>
                <th className="px-6 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2ED] text-[#2C2C2C]">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#8C887D] text-xs">
                    No reservations matched the filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const balance = b.total_amount - b.amount_paid;

                  return (
                    <tr key={b.id} className="hover:bg-[#FDFCF9]">
                      {/* Ref & Guest */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-[#8C887D] mb-0.5">
                          {b.id}
                        </div>
                        <div className="font-semibold text-[#2C2C2C]">{b.guest?.full_name}</div>
                        <div className="text-[11px] text-[#8C887D]">{b.guest?.email}</div>
                        {b.guest?.phone && (
                          <div className="text-[10px] text-[#8C887D] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {b.guest?.phone}
                          </div>
                        )}
                      </td>

                      {/* Room */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#2C2C2C]">
                          Room {b.room?.room_number || b.room_id}
                        </div>
                        <div className="text-[11px] text-[#8C887D]">{b.room?.room_type}</div>
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#2C2C2C] font-medium">
                          {b.check_in_date} → {b.check_out_date}
                        </div>
                        <div className="text-[11px] text-[#8C887D]">
                          {b.number_of_guests || 1} Guests
                        </div>
                        {b.actual_check_in && (
                          <div className="text-[10px] text-[#5A5A40] font-medium">
                            In: {new Date(b.actual_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider capitalize border ${
                            b.booking_status === 'checked_in'
                              ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                              : b.booking_status === 'confirmed'
                              ? 'bg-[#F5F2ED] text-[#5A5A40] border-[#E5E2D9]'
                              : b.booking_status === 'checked_out'
                              ? 'bg-[#FDFCF9] text-[#8C887D] border-[#E5E2D9]'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          ● {b.booking_status}
                        </span>
                      </td>

                      {/* Financials */}
                      <td className="px-6 py-4">
                        <div className="font-serif italic font-bold text-[#2C2C2C]">${b.total_amount}</div>
                        <div className="text-[11px] text-[#5A5A40]">Paid: ${b.amount_paid}</div>
                        {balance > 0 ? (
                          <div className="text-[11px] text-[#C4A484] font-bold">
                            Due: ${balance}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#8C887D]">Settled (Paid in Full)</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.booking_status === 'confirmed' && (
                            <button
                              onClick={() => handleCheckIn(b.id)}
                              title="Check-in guest"
                              className="px-3 py-1 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <LogIn className="w-3 h-3" />
                              Check In
                            </button>
                          )}

                          {b.booking_status === 'checked_in' && (
                            <button
                              onClick={() => handleCheckOut(b.id)}
                              title="Check-out guest"
                              className="px-3 py-1 bg-[#2C2C2C] hover:bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <LogOut className="w-3 h-3" />
                              Check Out
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenPaymentModal(b)}
                            title="Record manual payment"
                            className="px-3 py-1 bg-white hover:bg-[#F5F2ED] text-[#2C2C2C] border border-[#E5E2D9] text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <CreditCard className="w-3 h-3 text-[#5A5A40]" />
                            Pay
                          </button>

                          {b.booking_status !== 'cancelled' && b.booking_status !== 'checked_out' && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              title="Cancel booking"
                              className="p-1 text-[#8C887D] hover:text-rose-600 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentBooking && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaymentBooking(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
        >
          <div className="bg-[#FDFCF9] rounded-[32px] p-6 sm:p-8 max-w-md w-full border border-[#E5E2D9] shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#E5E2D9]">
              <h3 className="font-serif italic text-xl font-normal text-[#5A5A40]">
                Record Payment
              </h3>
              <button
                onClick={() => setPaymentBooking(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#E5E2D9] text-[#8C887D] hover:text-[#2C2C2C] flex items-center justify-center transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E5E2D9] text-xs space-y-1.5">
              <div className="flex justify-between font-semibold text-[#2C2C2C]">
                <span>Guest:</span>
                <span>{paymentBooking.guest?.full_name}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Room:</span>
                <span>Room {paymentBooking.room?.room_number}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Total Stays Bill:</span>
                <span>${paymentBooking.total_amount}</span>
              </div>
              <div className="flex justify-between font-bold text-[#5A5A40] pt-1.5 border-t border-[#F5F2ED]">
                <span>Outstanding Balance:</span>
                <span>${paymentBooking.total_amount - paymentBooking.amount_paid}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none font-bold text-[#2C2C2C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                >
                  <option value="credit_card">Credit Card (POS Terminal)</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="cash">Direct Cash Settlement</option>
                  <option value="bank_transfer">Bank Wire / Electronic Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E2D9]">
                <button
                  type="button"
                  onClick={() => setPaymentBooking(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs"
                >
                  {isProcessingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
