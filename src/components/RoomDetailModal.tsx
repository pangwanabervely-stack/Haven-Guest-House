import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Calendar,
  Check,
  Sparkles,
  BedDouble,
  DollarSign,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';
import { Room, Booking } from '../types';
import { api } from '../lib/api';
import { BookingCalendar } from './BookingCalendar';
import { ImageWithFallback } from './ui/ImageWithFallback';

interface RoomDetailModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (room: Room, checkIn: string, checkOut: string, guestsCount: number) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  isOpen,
  onClose,
  onBook
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  // Rules of Hooks: All hooks called unconditionally at top level
  const [checkInDate, setCheckInDate] = useState<string>(todayStr);
  const [checkOutDate, setCheckOutDate] = useState<string>(tomorrowStr);
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [roomBookings, setRoomBookings] = useState<Booking[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  // Reset defaults whenever modal opens for a new room
  useEffect(() => {
    if (isOpen && room) {
      setCheckInDate(todayStr);
      setCheckOutDate(tomorrowStr);
      setGuestsCount(Math.min(2, Math.max(1, Number(room.capacity) || 2)));
      setActiveImageIndex(0);
      setIsAvailable(null);
      setAvailabilityError('');

      api.getBookings({ roomId: room.id })
        .then((bookings) => setRoomBookings(bookings || []))
        .catch((err) => {
          console.error('Failed to load room bookings:', err);
          setRoomBookings([]);
        });
    }
  }, [isOpen, room?.id, todayStr, tomorrowStr]);

  // Check availability when dates change
  useEffect(() => {
    const checkAvail = async () => {
      if (!isOpen || !room?.id || !checkInDate || !checkOutDate) {
        setIsAvailable(null);
        return;
      }
      if (new Date(checkOutDate) <= new Date(checkInDate)) {
        setIsAvailable(false);
        setAvailabilityError('Check-out date must be after check-in date.');
        return;
      }

      setIsCheckingAvailability(true);
      setAvailabilityError('');
      try {
        const available = await api.checkRoomAvailability(room.id, checkInDate, checkOutDate);
        setIsAvailable(available);
        if (!available) {
          setAvailabilityError('This suite is already reserved for the selected dates. Please adjust dates.');
        }
      } catch (err: any) {
        setIsAvailable(null);
        setAvailabilityError(err.message || 'Error checking availability');
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    checkAvail();
  }, [isOpen, room?.id, checkInDate, checkOutDate]);

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Safe early exit AFTER all hooks have executed
  if (!isOpen || !room) {
    return null;
  }

  const roomCapacity = Math.max(1, Number(room.capacity) || 2);
  const amenitiesList = Array.isArray(room.amenities) ? room.amenities : [];
  const gallery = (room.gallery && room.gallery.length > 0 ? room.gallery : [room.image_url]).filter(Boolean);
  const safeGallery = gallery.length > 0 ? gallery : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'];

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    ) || 1
  );

  const pricePerNight = Number(room.price_per_night) || 0;
  const totalPrice = nights * pricePerNight;

  const handleReserveClick = () => {
    if (isAvailable && checkInDate && checkOutDate) {
      onBook(room, checkInDate, checkOutDate, guestsCount);
    }
  };

  const handleSelectDates = (inDate: string, outDate: string) => {
    setCheckInDate(inDate);
    setCheckOutDate(outDate);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#FDFCF9] rounded-[36px] shadow-2xl max-w-4xl w-full overflow-hidden border border-[#E5E2D9] my-8">
        {/* Gallery Carousel & Header */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-[#2C2C2C] overflow-hidden">
          <ImageWithFallback
            src={safeGallery[activeImageIndex] || safeGallery[0]}
            roomNumber={room.room_number}
            roomType={room.room_type}
            alt={room.room_type || 'Sanctuary Suite'}
            className="w-full h-full object-cover transition-all duration-300"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#2C2C2C]/90 via-transparent to-[#2C2C2C]/40" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#2C2C2C]/80 hover:bg-[#2C2C2C] text-white flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Carousel Arrows if multiple images */}
          {safeGallery.length > 1 && (
            <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : safeGallery.length - 1))}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((prev) => (prev < safeGallery.length - 1 ? prev + 1 : 0))}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2C2C2C]/90 text-[#E5D7C7] backdrop-blur-md border border-white/10">
              Room {room.room_number} &bull; {room.room_type}
            </span>
            <span className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
              room.cleaning_status === 'clean'
                ? 'bg-[#5A5A40]/90 text-[#FDFCF9] border-[#5A5A40]'
                : 'bg-[#C4A484]/90 text-[#2C2C2C] border-[#C4A484]'
            }`}>
              {room.cleaning_status === 'clean' ? 'Sanitized & Ready' : 'Housekeeping Active'}
            </span>
          </div>

          {/* Bottom Title */}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <h2 className="font-serif italic text-2xl sm:text-3xl font-medium text-[#FDFCF9]">
              {room.room_type} Suite #{room.room_number}
            </h2>
            <p className="text-xs text-[#E5E2D9] mt-1">
              Floor {room.floor || 1} &bull; {room.bed_type || 'King Bed'} &bull; Max {roomCapacity} Guests
            </p>
          </div>
        </div>

        {/* Modal Body: Split into Room Details and Booking Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 p-6 sm:p-8 gap-8">
          {/* Left Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-2">
                Suite Overview
              </h3>
              <p className="text-[#2C2C2C] text-xs leading-relaxed">
                {room.description || 'Spacious, handcrafted suite at The Haven Guest House with natural finishes, garden views, and artisanal amenities.'}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D] mb-3">
                Included Amenities & Comforts
              </h3>
              {amenitiesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {amenitiesList.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-[#2C2C2C] bg-white px-3.5 py-2 rounded-full border border-[#E5E2D9]"
                    >
                      <Check className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8C887D]">Artisanal toiletries, daily breakfast, and fiber Wi-Fi included.</p>
              )}
            </div>

            {/* Availability Calendar */}
            <div className="pt-2">
              <BookingCalendar
                roomId={room.id}
                roomNumber={room.room_number}
                existingBookings={roomBookings}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
                onSelectDates={handleSelectDates}
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F2ED] border border-[#E5E2D9] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
              <div className="text-xs text-[#5A5A40] leading-relaxed">
                <strong className="text-[#2C2C2C]">The Haven Guarantee:</strong> Direct bookings receive complimentary artisanal breakfast, high-speed fiber internet, and 24/7 host concierge assistance in Gweru, Zimbabwe.
              </div>
            </div>
          </div>

          {/* Right Booking Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E5E2D9] flex flex-col justify-between space-y-6 shadow-2xs">
            <div>
              <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-[#F5F2ED]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C887D]">
                  Nightly Rate
                </span>
                <div className="text-right">
                  <span className="text-2xl font-serif italic font-bold text-[#5A5A40]">
                    ${pricePerNight}
                  </span>
                  <span className="text-xs text-[#8C887D]"> / night</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    min={checkInDate || todayStr}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8C887D] mb-1">
                    Number of Guests
                  </label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs bg-[#FDFCF9] border border-[#E5E2D9] rounded-xl focus:ring-1 focus:ring-[#5A5A40] focus:outline-none text-[#2C2C2C]"
                  >
                    {Array.from({ length: roomCapacity }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} Guest{num > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="mt-6 pt-4 border-t border-[#F5F2ED] space-y-2 text-xs">
                <div className="flex justify-between text-[#8C887D]">
                  <span>${pricePerNight} &times; {nights} {nights === 1 ? 'night' : 'nights'}</span>
                  <span className="font-semibold text-[#2C2C2C]">${totalPrice}</span>
                </div>
                <div className="flex justify-between text-[#8C887D]">
                  <span>Resort Sanctuary Fee</span>
                  <span className="text-emerald-700 font-semibold">Included</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#2C2C2C] pt-2 border-t border-[#F5F2ED]">
                  <span>Total Estimated</span>
                  <span className="font-serif italic text-base text-[#5A5A40]">${totalPrice}</span>
                </div>
              </div>

              {/* Availability status notice */}
              {isCheckingAvailability ? (
                <div className="mt-3 text-xs text-[#8C887D] flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
                  <span>Checking room calendar...</span>
                </div>
              ) : availabilityError ? (
                <div className="mt-3 text-xs text-rose-700 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {availabilityError}
                </div>
              ) : isAvailable === true ? (
                <div className="mt-3 text-xs text-emerald-800 font-medium bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Suite is available for these dates!</span>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!isAvailable || isCheckingAvailability}
              onClick={handleReserveClick}
              className="w-full py-3 bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors shadow-xs cursor-pointer"
            >
              Proceed to Reserve Suite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
