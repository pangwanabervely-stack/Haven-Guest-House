import React from 'react';
import {
  X,
  Printer,
  Calendar,
  BedDouble,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wifi,
  Coffee,
  Moon,
  MessageSquare,
  UtensilsCrossed,
  Edit,
  XCircle,
  FileText,
  CreditCard,
  Star
} from 'lucide-react';
import { Booking } from '../../types';

interface GuestBookingDetailProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onModifyDates?: (booking: Booking) => void;
  onCancelBooking?: (bookingId: string) => void;
  onOrderRoomService?: () => void;
  onMessageHost?: () => void;
  onPayWithPaynow?: (booking: Booking) => void;
  onLeaveReview?: (booking: Booking) => void;
}

export const GuestBookingDetail: React.FC<GuestBookingDetailProps> = ({
  booking,
  isOpen,
  onClose,
  onModifyDates,
  onCancelBooking,
  onOrderRoomService,
  onMessageHost,
  onPayWithPaynow,
  onLeaveReview
}) => {
  if (!isOpen || !booking) return null;

  const inDate = new Date(booking.check_in_date);
  const outDate = new Date(booking.check_out_date);
  const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
  const balanceRemaining = Math.max(0, Number(booking.total_amount) - Number(booking.amount_paid));

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return {
          label: 'Checked In',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          bg: 'bg-[#5A5A40]/15 text-[#5A5A40] border-[#5A5A40]/30'
        };
      case 'checked_out':
        return {
          label: 'Checked Out',
          bg: 'bg-stone-100 text-stone-700 border-stone-300'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: 'bg-rose-100 text-rose-800 border-rose-300'
        };
      default:
        return {
          label: status,
          bg: 'bg-amber-100 text-amber-800 border-amber-300'
        };
    }
  };

  const statusBadge = getStatusBadge(booking.booking_status);

  return (
    <div
      id="guest-booking-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print:block"
    >
      <div className="bg-[#FDFCF9] rounded-[32px] shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-[#E5E2D9] my-auto print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none print:max-h-none print:my-0 print:overflow-visible">
        {/* TOP INTERACTIVE ACTION BAR (Hidden when printed) */}
        <div className="flex items-center justify-between p-4 sm:px-8 border-b border-[#E5E2D9] bg-white sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F5F2ED] flex items-center justify-center text-[#5A5A40]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Guest Booking Detail
              </div>
              <div className="text-xs font-mono font-bold text-[#2C2C2C]">
                Ref #{booking.id.toUpperCase().slice(0, 16)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Primary Print Button */}
            <button
              id="print-booking-detail-button"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              title="Trigger browser print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print Summary</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#2C2C2C] flex items-center justify-center transition-colors cursor-pointer"
              title="Close view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DEDICATED PRINT-FRIENDLY CONTAINER */}
        <div
          id="guest-booking-detail-print"
          className="p-6 sm:p-8 space-y-6 text-[#2C2C2C] bg-[#FDFCF9] print:bg-white print:p-6 print:space-y-5"
        >
          {/* Header & Property Brand */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#5A5A40] pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#C4A484] print:hidden" />
                <span>The Haven Guest House • Official Stay Record</span>
              </div>
              <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#2C2C2C]">
                Reservation Summary & Voucher
              </h1>
              <div className="text-xs text-[#8C887D] space-y-0.5 pt-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                  <span>3669 Woodlands 2, Gweru, Zimbabwe</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                  <span>+263 772 529 212 • pangwanabervely@gmail.com</span>
                </p>
              </div>
            </div>

            <div className="sm:text-right flex flex-row sm:flex-col justify-between items-end sm:items-end gap-2">
              <div className="inline-block px-3.5 py-1.5 bg-white print:bg-[#F5F2ED] border border-[#E5E2D9] rounded-xl text-left sm:text-right shadow-2xs print:shadow-none">
                <span className="text-[9px] uppercase tracking-widest text-[#8C887D] font-bold block">
                  Confirmation Code
                </span>
                <span className="font-mono font-bold text-sm text-[#5A5A40]">
                  {booking.id.toUpperCase().slice(0, 16)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusBadge.bg}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Stay Timeline Highlights */}
          <div className="p-4 bg-white print:bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] shadow-2xs print:shadow-none grid grid-cols-3 gap-2 text-center">
            <div className="p-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block mb-0.5">
                Check-In
              </span>
              <span className="font-serif italic font-bold text-sm sm:text-base text-[#2C2C2C] block">
                {booking.check_in_date}
              </span>
              <span className="text-[10px] text-[#8C887D] block mt-0.5">From 2:00 PM</span>
            </div>

            <div className="p-2 border-x border-[#E5E2D9] flex flex-col justify-center items-center">
              <span className="text-[10px] uppercase tracking-wider text-[#5A5A40] font-bold block mb-0.5">
                Stay Length
              </span>
              <span className="font-serif italic font-bold text-base sm:text-lg text-[#5A5A40]">
                {nights} {nights === 1 ? 'Night' : 'Nights'}
              </span>
              <span className="text-[10px] text-[#8C887D] block">
                {booking.number_of_guests || 1} Guest{(booking.number_of_guests || 1) > 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block mb-0.5">
                Check-Out
              </span>
              <span className="font-serif italic font-bold text-sm sm:text-base text-[#2C2C2C] block">
                {booking.check_out_date}
              </span>
              <span className="text-[10px] text-[#8C887D] block mt-0.5">By 10:00 AM</span>
            </div>
          </div>

          {/* Details Grid: Guest Information & Reserved Accommodation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guest Profile Card */}
            <div className="bg-white print:bg-[#FDFCF9] p-5 rounded-2xl border border-[#E5E2D9] space-y-3">
              <div className="flex items-center gap-2 border-b border-[#F5F2ED] pb-2">
                <User className="w-4 h-4 text-[#5A5A40]" />
                <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold">
                  Primary Guest Information
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-serif italic font-bold text-base text-[#2C2C2C]">
                  {booking.guest?.full_name || 'Registered Guest'}
                </div>
                <div className="text-[#8C887D] flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                  <span>{booking.guest?.email || 'N/A'}</span>
                </div>
                {booking.guest?.phone && (
                  <div className="text-[#8C887D] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                    <span>{booking.guest.phone}</span>
                  </div>
                )}
                <div className="text-[11px] text-[#5A5A40] font-semibold pt-1">
                  Party Size: {booking.number_of_guests || 1} Registered Guest{(booking.number_of_guests || 1) > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Room Card */}
            <div className="bg-white print:bg-[#FDFCF9] p-5 rounded-2xl border border-[#E5E2D9] space-y-3">
              <div className="flex items-center gap-2 border-b border-[#F5F2ED] pb-2">
                <BedDouble className="w-4 h-4 text-[#5A5A40]" />
                <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold">
                  Reserved Accommodation
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-serif italic font-bold text-base text-[#2C2C2C]">
                  {booking.room?.room_type || 'Standard'} Suite #{booking.room?.room_number || '101'}
                </div>
                <div className="text-[#8C887D]">
                  Bed Configuration: {booking.room?.bed_type || 'King Bed'} • Floor {booking.room?.floor || 1}
                </div>
                <div className="text-[#8C887D]">
                  Standard Nightly Rate: ${booking.room?.price_per_night || 120} / night
                </div>
                {booking.room?.amenities && booking.room.amenities.length > 0 && (
                  <div className="text-[10px] text-[#8C887D] pt-1">
                    Amenities: {booking.room.amenities.slice(0, 4).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment & Financial Ledger */}
          <div className="bg-white print:bg-white border border-[#E5E2D9] rounded-2xl overflow-hidden shadow-2xs print:shadow-none">
            <div className="bg-[#F5F2ED] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A5A40] border-b border-[#E5E2D9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Financial & Payment Summary</span>
              </div>
              <span className="capitalize text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-[#E5E2D9] text-[#2C2C2C]">
                Payment Status: {booking.payment_status}
              </span>
            </div>

            <div className="p-5 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#8C887D]">
                <span>Room Charges ({nights} nights × ${booking.room?.price_per_night || (Number(booking.total_amount) / nights).toFixed(0)})</span>
                <span className="font-medium text-[#2C2C2C]">${booking.total_amount}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Resort & Sanctuary Hospitality Surcharge</span>
                <span className="text-emerald-700 font-medium">Included ($0.00)</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Total Amount Paid to Date</span>
                <span className="font-medium text-emerald-800">${booking.amount_paid}</span>
              </div>

              <div className="border-t border-[#E5E2D9] pt-3 flex items-center justify-between font-bold text-sm">
                <span className="text-[#2C2C2C]">Outstanding Balance at Check-in:</span>
                <span className="font-serif italic text-base text-[#5A5A40]">
                  ${balanceRemaining.toFixed(2)}
                </span>
              </div>

              {/* In-ledger Paynow Button */}
              {Number(booking.amount_paid) < Number(booking.total_amount) && booking.payment_status !== 'paid' && booking.booking_status !== 'cancelled' && onPayWithPaynow && (
                <div className="pt-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => onPayWithPaynow(booking)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-98"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>PAY WITH PAYNOW (${balanceRemaining.toFixed(2)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Guest Notes / Special Requests */}
          {booking.guest_notes && (
            <div className="p-4 bg-white print:bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] text-xs space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block">
                Guest Notes & Arrival Preferences
              </span>
              <p className="text-[#2C2C2C] italic">"{booking.guest_notes}"</p>
            </div>
          )}

          {/* Property Guidelines for the Guest */}
          <div className="p-4 bg-[#F5F2ED]/70 print:bg-white rounded-2xl border border-[#E5E2D9] space-y-2 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A40] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
              Guest House Arrival & Stay Guidelines
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8C887D]">
              <div className="flex items-start gap-2">
                <Wifi className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5" />
                <span><strong>Wi-Fi:</strong> <em>TheHaven_Guest</em> | Passcode: <em>HavenStay2026</em></span>
              </div>
              <div className="flex items-start gap-2">
                <Coffee className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5" />
                <span><strong>Breakfast:</strong> Daily 7:00 AM – 10:00 AM in the dining area or room.</span>
              </div>
              <div className="flex items-start gap-2">
                <Moon className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5" />
                <span><strong>Quiet Hours:</strong> 10:00 PM – 6:30 AM observed across all rooms.</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0 mt-0.5" />
                <span><strong>Host Assistance:</strong> Direct assistance via in-app chat or +263 772 529 212.</span>
              </div>
            </div>
          </div>

          {/* Footer Print Stamp */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E2D9] text-[10px] text-[#8C887D]">
            <span>The Haven Guest House • Verified Reservation Record</span>
            <span className="font-mono font-bold text-[#5A5A40]">
              STAY-CONFIRMED-#{booking.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* BOTTOM INTERACTIVE ACTIONS (Hidden when printed) */}
        <div className="p-6 border-t border-[#E5E2D9] bg-[#F5F2ED] flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {balanceRemaining > 0 && booking.booking_status !== 'cancelled' && onPayWithPaynow && (
              <button
                type="button"
                onClick={() => onPayWithPaynow(booking)}
                className="px-4 py-2 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                PAY WITH PAYNOW (${balanceRemaining.toFixed(2)})
              </button>
            )}

            {booking.booking_status === 'checked_out' && onLeaveReview && (
              <button
                type="button"
                onClick={() => onLeaveReview(booking)}
                className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                Review Stay
              </button>
            )}

            {onModifyDates && booking.booking_status !== 'cancelled' && booking.booking_status !== 'checked_out' && booking.booking_status !== 'checked_in' && (
              <button
                type="button"
                onClick={() => onModifyDates(booking)}
                className="px-4 py-2 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#5A5A40]" />
                Modify Dates
              </button>
            )}

            {onCancelBooking && booking.booking_status !== 'cancelled' && booking.booking_status !== 'checked_out' && booking.booking_status !== 'checked_in' && (
              <button
                type="button"
                onClick={() => onCancelBooking(booking.id)}
                className="px-4 py-2 rounded-full bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Stay
              </button>
            )}

            {onOrderRoomService && (
              <button
                type="button"
                onClick={onOrderRoomService}
                className="px-4 py-2 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#5A5A40]" />
                Room Service
              </button>
            )}

            {onMessageHost && (
              <button
                type="button"
                onClick={onMessageHost}
                className="px-4 py-2 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#C4A484]" />
                Message Host
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 rounded-full bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Summary
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#FDFCF9] text-[#2C2C2C] text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
