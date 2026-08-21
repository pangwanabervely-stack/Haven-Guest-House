import React from 'react';
import { X, Printer, BedDouble, Calendar, DollarSign, ShieldCheck, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { Booking } from '../types';

interface ReservationPrintModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReservationPrintModal: React.FC<ReservationPrintModalProps> = ({
  booking,
  isOpen,
  onClose
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const inD = new Date(booking.check_in_date);
  const outD = new Date(booking.check_out_date);
  const nights = Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
  const balanceRemaining = Math.max(0, Number(booking.total_amount) - Number(booking.amount_paid));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm print:p-0 print:bg-white print:static"
    >
      <div className="bg-[#FDFCF9] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E5E2D9] print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none print:max-h-none">
        {/* Modal Action Bar (Hidden when printed) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-[#E5E2D9] bg-white sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#5A5A40]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
              Reservation Confirmation Voucher
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F5F2ED] hover:bg-[#E5E2D9] text-[#2C2C2C] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-8 space-y-6 text-[#2C2C2C] bg-white print:p-6" id="printable-voucher">
          {/* Header Brand */}
          <div className="flex items-start justify-between border-b-2 border-[#5A5A40] pb-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#5A5A40] font-bold">
                Official Booking Confirmation
              </div>
              <h1 className="font-serif italic font-bold text-2xl sm:text-3xl text-[#2C2C2C] mt-0.5">
                The Haven Guest House
              </h1>
              <div className="text-xs text-[#8C887D] mt-1 space-y-0.5">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#5A5A40]" />
                  3669 Woodlands 2, Gweru, Zimbabwe
                </p>
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#5A5A40]" />
                  +263 772 529 212 • info@thehavenguesthouse.co.zw
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-[#F5F2ED] border border-[#E5E2D9] rounded-lg">
                <span className="text-[9px] uppercase tracking-widest text-[#8C887D] font-bold block">
                  Reference Code
                </span>
                <span className="font-mono font-bold text-sm text-[#5A5A40]">
                  {booking.id.toUpperCase().slice(0, 16)}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-[#8C887D]">
                Issued: {new Date(booking.created_at || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Guest & Room Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guest Info */}
            <div className="bg-[#FDFCF9] p-4 rounded-2xl border border-[#E5E2D9]">
              <div className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold mb-2">
                Guest Information
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-serif italic font-bold text-sm text-[#2C2C2C]">
                  {booking.guest?.full_name || 'Guest'}
                </div>
                <div className="text-[#8C887D]">{booking.guest?.email || 'N/A'}</div>
                {booking.guest?.phone && <div className="text-[#8C887D]">{booking.guest.phone}</div>}
                <div className="pt-1 text-[11px] text-[#5A5A40] font-semibold">
                  Registered Party: {booking.number_of_guests || 1} Guest{(booking.number_of_guests || 1) > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Room Info */}
            <div className="bg-[#FDFCF9] p-4 rounded-2xl border border-[#E5E2D9]">
              <div className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold mb-2">
                Reserved Accommodation
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-serif italic font-bold text-sm text-[#2C2C2C]">
                  {booking.room?.room_type || 'Standard'} Suite #{booking.room?.room_number || '101'}
                </div>
                <div className="text-[#8C887D]">
                  {booking.room?.bed_type || 'King Bed'} • Floor {booking.room?.floor || 1}
                </div>
                <div className="text-[#8C887D]">
                  ${booking.room?.price_per_night || 120} / night
                </div>
                <div className="pt-1 text-[11px] text-[#5A5A40] font-semibold capitalize">
                  Status: {booking.booking_status.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Stay Timeline Bar */}
          <div className="p-4 bg-[#F5F2ED] rounded-2xl border border-[#E5E2D9] grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block">
                Check-In Date
              </span>
              <span className="font-serif italic font-bold text-sm sm:text-base text-[#2C2C2C] block mt-0.5">
                {booking.check_in_date}
              </span>
              <span className="text-[10px] text-[#8C887D]">From 2:00 PM</span>
            </div>

            <div className="border-x border-[#E5E2D9] flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-wider text-[#5A5A40] font-bold block">
                Duration
              </span>
              <span className="font-serif italic font-bold text-base sm:text-lg text-[#5A5A40]">
                {nights} {nights === 1 ? 'Night' : 'Nights'}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block">
                Check-Out Date
              </span>
              <span className="font-serif italic font-bold text-sm sm:text-base text-[#2C2C2C] block mt-0.5">
                {booking.check_out_date}
              </span>
              <span className="text-[10px] text-[#8C887D]">By 10:00 AM</span>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="border border-[#E5E2D9] rounded-2xl overflow-hidden">
            <div className="bg-[#F5F2ED] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#5A5A40] border-b border-[#E5E2D9] flex justify-between">
              <span>Financial & Payment Summary</span>
              <span className="capitalize">{booking.payment_status}</span>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#8C887D]">
                <span>Room Rate (${booking.room?.price_per_night || 120} × {nights} nights)</span>
                <span className="font-medium text-[#2C2C2C]">${booking.total_amount}</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Taxes & Sanctuary Hospitality Surcharge</span>
                <span className="text-emerald-700 font-medium">Included</span>
              </div>
              <div className="flex justify-between text-[#8C887D]">
                <span>Amount Paid to Date</span>
                <span className="font-medium text-[#2C2C2C]">${booking.amount_paid}</span>
              </div>
              <div className="border-t border-[#E5E2D9] pt-2 flex justify-between font-bold text-sm">
                <span className="text-[#2C2C2C]">Outstanding Balance at Check-in:</span>
                <span className="font-serif italic text-[#5A5A40]">${balanceRemaining.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Special Requests */}
          {booking.guest_notes && (
            <div className="p-3.5 bg-[#FDFCF9] rounded-2xl border border-[#E5E2D9] text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#8C887D] font-bold block mb-1">
                Guest Notes & Arrival Preferences
              </span>
              <p className="text-[#2C2C2C] italic">"{booking.guest_notes}"</p>
            </div>
          )}

          {/* Guest House Policies & Guidelines */}
          <div className="pt-2 border-t border-[#E5E2D9] text-[11px] text-[#8C887D] space-y-1.5 leading-relaxed">
            <div className="font-bold uppercase tracking-wider text-[#5A5A40] text-[10px]">
              Guest House Arrival & Stay Guidelines
            </div>
            <p>• <strong>High-Speed Wi-Fi:</strong> Network <em>TheHaven_Guest</em> | Passcode: <em>HavenStay2026</em></p>
            <p>• <strong>Morning Breakfast:</strong> Served in the dining area or room from 7:00 AM to 10:00 AM.</p>
            <p>• <strong>House Sanctuary Hours:</strong> Quiet hours are observed between 10:00 PM and 6:30 AM.</p>
            <p>• <strong>Host Assistance:</strong> Need extra towels, solar backup assistance, or late arrival? Message host Bervely directly via the app.</p>
          </div>

          {/* Footer stamp */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E2D9] text-[10px] text-[#8C887D]">
            <span>The Haven Guest House • Certified Hospitality Record</span>
            <span className="font-mono">VERIFIED RESERVATION</span>
          </div>
        </div>
      </div>
    </div>
  );
};
