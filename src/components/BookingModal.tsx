import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Tag,
  Check,
  Sparkles,
  Gift,
  Users,
  Clock,
  Printer,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Room, Booking, FeaturedOffer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../lib/api';
import { useToast } from './ui/Toast';
import { BookingCalendar } from './BookingCalendar';
import { ReservationPrintModal } from './ReservationPrintModal';
import { PaynowPaymentModal } from './payment/PaynowPaymentModal';

interface BookingModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialPromoCode?: string;
  initialOffer?: FeaturedOffer | null;
  onBookingSuccess: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  room,
  isOpen,
  onClose,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  initialPromoCode = '',
  initialOffer = null,
  onBookingSuccess
}) => {
  const { currentUser } = useAuth();
  const { notifyNewBooking } = useNotifications();
  const { success, error } = useToast();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn || todayStr);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut || tomorrowStr);
  const [numberOfGuests, setNumberOfGuests] = useState(initialGuests);
  const [guestName, setGuestName] = useState(currentUser?.full_name || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');
  const [emergencyName, setEmergencyName] = useState(currentUser?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser?.emergency_contact_phone || '');
  const [guestNotes, setGuestNotes] = useState('');
  const [promoInput, setPromoInput] = useState(initialPromoCode || (initialOffer?.promoCode || ''));
  const [appliedPromo, setAppliedPromo] = useState<string>(initialPromoCode || (initialOffer?.promoCode || ''));
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [roomBookings, setRoomBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isPaynowOpen, setIsPaynowOpen] = useState(false);

  // Sync initial parameters when modal opens or offer is claimed
  useEffect(() => {
    if (isOpen && room) {
      if (initialCheckIn) setCheckInDate(initialCheckIn);
      if (initialCheckOut) setCheckOutDate(initialCheckOut);
      if (initialGuests) setNumberOfGuests(initialGuests);

      const code = initialPromoCode || initialOffer?.promoCode || '';
      if (code) {
        setPromoInput(code);
        setAppliedPromo(code);
      }

      // Fetch existing bookings for this room to populate calendar locks
      setIsLoadingBookings(true);
      api.getBookings({ roomId: room.id })
        .then((bookings) => {
          setRoomBookings(bookings);
        })
        .catch((err) => {
          console.error('Error fetching room bookings for calendar:', err);
        })
        .finally(() => {
          setIsLoadingBookings(false);
        });
    }
  }, [isOpen, room, initialCheckIn, initialCheckOut, initialGuests, initialPromoCode, initialOffer]);

  if (!isOpen || !room) return null;

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    ) || 1
  );

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !confirmedBooking) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, confirmedBooking, onClose]);

  const baseTotalAmount = nights * room.price_per_night;

  // Calculate discounts based on applied promo code
  let discountAmount = 0;
  let promoPerkSummary = '';
  const normalizedPromo = appliedPromo.trim().toUpperCase();

  if (normalizedPromo === 'HARVEST25') {
    if (nights >= 3) {
      discountAmount = Math.round(baseTotalAmount * 0.25);
      promoPerkSummary = '25% Seasonal Discount + Complimentary Late Checkout & Tea Welcome';
    } else {
      promoPerkSummary = 'HARVEST25 requires a minimum of 3 nights stay.';
    }
  } else if (normalizedPromo === 'MIDWEEKREST') {
    if (nights >= 2) {
      discountAmount = Math.min(baseTotalAmount, 60 * nights);
      promoPerkSummary = '$60/night Midweek Discount + Gigabit Fiber & Coffee Pass';
    } else {
      promoPerkSummary = 'MIDWEEKREST requires a minimum of 2 nights stay.';
    }
  } else if (normalizedPromo === 'ARTISANPAIR') {
    promoPerkSummary = 'Complimentary 4-Course Tasting Dinner & Coastal Wine Bottle Included';
  } else if (normalizedPromo === 'ROMANCEHAVEN') {
    promoPerkSummary = 'Chilled Organic Prosecco, Lavender Spa Kit & In-Bed Breakfast Included';
  }

  const finalTotalAmount = Math.max(0, baseTotalAmount - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setAppliedPromo('');
      setPromoMessage(null);
      return;
    }

    if (code === 'HARVEST25') {
      setAppliedPromo(code);
      if (nights < 3) {
        setPromoMessage({
          type: 'error',
          text: 'HARVEST25 active, but requires at least 3 nights to apply the 25% discount.'
        });
      } else {
        setPromoMessage({
          type: 'success',
          text: 'HARVEST25 applied! 25% discount + late checkout included.'
        });
      }
    } else if (code === 'MIDWEEKREST') {
      setAppliedPromo(code);
      if (nights < 2) {
        setPromoMessage({
          type: 'error',
          text: 'MIDWEEKREST requires a minimum 2-night stay.'
        });
      } else {
        setPromoMessage({
          type: 'success',
          text: 'MIDWEEKREST applied! $60/night deducted from your total.'
        });
      }
    } else if (code === 'ARTISANPAIR') {
      setAppliedPromo(code);
      setPromoMessage({
        type: 'success',
        text: 'ARTISANPAIR applied! 4-Course Tasting Dinner & Wine included at no extra charge.'
      });
    } else if (code === 'ROMANCEHAVEN') {
      setAppliedPromo(code);
      setPromoMessage({
        type: 'success',
        text: 'ROMANCEHAVEN applied! Prosecco & Lavender Spa Kit added to your suite.'
      });
    } else {
      setPromoMessage({
        type: 'error',
        text: 'Invalid promo code. Check the Featured Offers section on the landing page.'
      });
    }
  };

  const handleDatesSelected = (inDate: string, outDate: string) => {
    setCheckInDate(inDate);
    setCheckOutDate(outDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      error('Please sign in or select a guest profile before making a reservation.');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      error('Please select both your check-in and check-out dates on the calendar.');
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      error('Check-out date must be after check-in date.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile info if changed
      if (
        guestName !== currentUser.full_name ||
        guestPhone !== currentUser.phone ||
        emergencyName !== currentUser.emergency_contact_name ||
        emergencyPhone !== currentUser.emergency_contact_phone
      ) {
        await api.updateProfile(currentUser.id, {
          full_name: guestName,
          phone: guestPhone,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone
        });
      }

      // Build comprehensive notes including applied promo package
      let compiledNotes = guestNotes.trim();
      if (appliedPromo && promoPerkSummary) {
        const promoTag = `[Promo Applied: ${appliedPromo} — ${promoPerkSummary}]`;
        compiledNotes = compiledNotes ? `${compiledNotes}\n\n${promoTag}` : promoTag;
      }

      // Create booking in database with discounted final amount
      const newBooking = await api.createBooking({
        guest_id: currentUser.id,
        room_id: room.id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: numberOfGuests,
        guest_notes: compiledNotes,
        amount_paid: 0 // Payment pending upon arrival / online settlement
      });

      // Confetti burst for real celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }

      setConfirmedBooking(newBooking);
      notifyNewBooking({
        bookingId: newBooking.id,
        guestId: currentUser.id,
        guestName: guestName || currentUser.full_name || 'Guest',
        roomNumber: room.room_number,
        totalAmount: Number(newBooking.total_amount || finalTotalAmount)
      });
      success(`Reservation confirmed for Room ${room.room_number}!`);
      onBookingSuccess(newBooking);
    } catch (err: any) {
      error(err.message || 'Failed to complete reservation. Selected dates overlap with an existing booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmedBooking && !isSubmitting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#FDFCF9] rounded-[32px] shadow-2xl max-w-2xl w-full overflow-hidden border border-[#E5E2D9] my-6">
        {/* Modal Header */}
        <div className="bg-[#2C2C2C] text-white p-6 relative flex items-center justify-between border-b border-[#3E3E3E]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#C4A484] font-bold mb-1">
              Confirmed Reservation Flow
            </div>
            <h2 className="text-2xl font-serif italic font-normal text-[#FDFCF9]">
              {confirmedBooking ? 'Reservation Confirmed!' : `Book Room ${room.room_number} — ${room.room_type}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#E5E2D9] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedBooking ? (
          /* SUCCESS STATE */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-[#5A5A40]" />
            </div>

            <div>
              <h3 className="font-serif italic text-2xl font-medium text-[#2C2C2C]">
                You're All Set, {currentUser?.full_name || 'Guest'}!
              </h3>
              <p className="text-xs text-[#8C887D] max-w-md mx-auto mt-2 leading-relaxed">
                Your booking has been saved directly to the database. Your suite will be freshly prepared and inspected before your arrival.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E5E2D9] max-w-lg mx-auto text-left space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#F5F2ED]">
                <span className="text-[#8C887D]">Booking Reference:</span>
                <span className="font-mono font-bold text-[#2C2C2C]">{confirmedBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Room Number:</span>
                <span className="font-semibold text-[#2C2C2C]">Room {room.room_number} ({room.room_type})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Dates of Stay:</span>
                <span className="font-medium text-[#2C2C2C]">{confirmedBooking.check_in_date} → {confirmedBooking.check_out_date} ({nights} nights)</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-[#5A5A40] bg-[#F5F2ED] p-2 rounded-xl border border-[#E5E2D9]">
                  <span className="font-bold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Promo {appliedPromo}:
                  </span>
                  <span className="font-semibold">{discountAmount > 0 ? `-$${discountAmount} Savings` : 'Perks Added'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Total Due at Check-in:</span>
                <span className="font-serif italic font-bold text-base text-[#5A5A40]">${confirmedBooking.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C887D]">Booking Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2D9] capitalize">
                  {confirmedBooking.booking_status}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsPaynowOpen(true)}
                className="px-6 py-3 rounded-full bg-[#3B6E52] hover:bg-[#2F5942] text-white font-bold text-xs uppercase tracking-widest transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                PAY NOW WITH PAYNOW (${confirmedBooking.total_amount})
              </button>
              <button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                className="px-5 py-3 rounded-full bg-white border border-[#E5E2D9] hover:bg-[#F5F2ED] text-[#2C2C2C] font-bold text-xs uppercase tracking-widest transition-colors shadow-2xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-[#5A5A40]" />
                Print Voucher
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-full bg-[#2C2C2C] hover:bg-[#1C1C1C] text-white font-bold text-xs uppercase tracking-widest transition-colors shadow-xs"
              >
                My Reservations
              </button>
            </div>

            {/* Paynow Payment Modal */}
            {confirmedBooking && (
              <PaynowPaymentModal
                booking={confirmedBooking}
                isOpen={isPaynowOpen}
                onClose={() => setIsPaynowOpen(false)}
                onPaymentSuccess={(updated) => {
                  setConfirmedBooking(updated);
                  onBookingSuccess(updated);
                }}
              />
            )}

            {/* Print Voucher Modal */}
            <ReservationPrintModal
              booking={confirmedBooking}
              isOpen={isPrintOpen}
              onClose={() => setIsPrintOpen(false)}
            />
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Stay Summary Bar */}
            <div className="p-4 bg-white border border-[#E5E2D9] rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <img
                  src={room.image_url}
                  alt={room.room_type}
                  className="w-14 h-14 rounded-xl object-cover border border-[#E5E2D9]"
                />
                <div>
                  <div className="font-serif italic font-medium text-[#2C2C2C] text-sm">
                    {room.room_type} Suite #{room.room_number}
                  </div>
                  <div className="text-xs text-[#8C887D]">
                    ${room.price_per_night} / night • Max {room.capacity} Guests
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-[#8C887D]">Estimated Total ({nights} {nights === 1 ? 'night' : 'nights'})</div>
                <div className="flex items-center gap-2 justify-end">
                  {discountAmount > 0 && (
                    <span className="text-xs line-through text-[#8C887D]">
                      ${baseTotalAmount}
                    </span>
                  )}
                  <span className="text-xl font-serif italic font-bold text-[#5A5A40]">
                    ${finalTotalAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Stay Calendar & Overlap Prevention */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-[#8C887D] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#5A5A40]" />
                  Select Stay Dates on Interactive Calendar
                </label>
                <span className="text-[10px] text-[#8C887D]">
                  {isLoadingBookings ? 'Checking reservations...' : 'Already booked dates are locked'}
                </span>
              </div>

              <BookingCalendar
                roomId={room.id}
                roomNumber={room.room_number}
                existingBookings={roomBookings}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
                onSelectDates={handleDatesSelected}
                minNights={normalizedPromo === 'HARVEST25' ? 3 : normalizedPromo === 'MIDWEEKREST' ? 2 : 1}
              />
            </div>

            {/* Guest Details & Party Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Number of Guests
                </label>
                <div className="relative">
                  <select
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none appearance-none"
                  >
                    {Array.from({ length: room.capacity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'} (Max {room.capacity})
                      </option>
                    ))}
                  </select>
                  <Users className="w-4 h-4 text-[#8C887D] absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C887D] uppercase tracking-wider mb-1">
                  Stay Duration Summary
                </label>
                <div className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E2D9] rounded-xl text-[#2C2C2C] flex items-center justify-between">
                  <span className="text-[#5A5A40] font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C4A484]" />
                    {checkInDate && checkOutDate ? `${nights} ${nights === 1 ? 'Night' : 'Nights'}` : 'Pick dates'}
                  </span>
                  <span className="text-[11px] text-[#8C887D]">
                    ${room.price_per_night} × {nights}
                  </span>
                </div>
              </div>
            </div>

            {/* Promo Code & Featured Offers Bar */}
            <div className="bg-[#F5F2ED] p-3.5 rounded-2xl border border-[#E5E2D9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A40] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C4A484]" />
                  Promo Code / Featured Offer
                </label>
                <span className="text-[10px] text-[#8C887D]">e.g. HARVEST25, MIDWEEKREST, ARTISANPAIR</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-1.5 text-xs uppercase font-mono bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shadow-2xs"
                >
                  Apply
                </button>
                {(promoInput || appliedPromo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPromoInput('');
                      setAppliedPromo('');
                      setPromoMessage(null);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-[#F5F2ED] text-[#8C887D] hover:text-[#2C2C2C] border border-[#E5E2D9] text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {promoMessage && (
                <div
                  className={`text-[11px] px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    promoMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {promoMessage.type === 'success' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{promoMessage.text}</span>
                </div>
              )}

              {appliedPromo && promoPerkSummary && (
                <div className="text-[11px] text-[#5A5A40] font-medium flex items-center gap-1.5 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C4A484] shrink-0" />
                  <span>{promoPerkSummary}</span>
                </div>
              )}
            </div>

            {/* Guest Details */}
            <div className="space-y-4 pt-2 border-t border-[#E5E2D9]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                Primary Guest & Emergency Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                    Primary Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Mary Doe (Spouse)"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+1 (555) 999-0000"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2C2C2C] mb-1">
                  Special Requests / Arrival Notes
                </label>
                <textarea
                  rows={2}
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  placeholder="Late check-in, feather-free pillows, dietary preferences..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E5E2D9] rounded-xl text-[#2C2C2C] focus:ring-1 focus:ring-[#5A5A40] focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Submission Actions */}
            <div className="pt-4 border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#8C887D] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
                <span>Instant database reservation • Free cancellation up to 48h</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8C887D] hover:text-[#2C2C2C] transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all shadow-xs flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirm & Book</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

