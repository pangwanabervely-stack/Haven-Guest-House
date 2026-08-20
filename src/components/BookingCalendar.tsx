import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Lock,
  Check,
  AlertCircle,
  RotateCcw,
  Moon,
  Info
} from 'lucide-react';
import { Booking } from '../types';

interface BookingCalendarProps {
  roomId: string;
  roomNumber: string;
  existingBookings: Booking[];
  checkInDate: string;
  checkOutDate: string;
  onSelectDates: (checkIn: string, checkOut: string) => void;
  minNights?: number;
}

// Format Date object to local YYYY-MM-DD string
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string to Date at midnight
export function parseYMDToDate(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  roomId,
  roomNumber,
  existingBookings = [],
  checkInDate,
  checkOutDate,
  onSelectDates,
  minNights = 1
}) => {
  // Determine initial display month (based on checkInDate or today)
  const initialDate = checkInDate ? parseYMDToDate(checkInDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Today string at midnight
  const todayStr = useMemo(() => formatDateToYMD(new Date()), []);

  // Compute set of all booked date strings for this room
  const bookedDatesSet = useMemo(() => {
    const set = new Set<string>();
    const safeBookings = Array.isArray(existingBookings) ? existingBookings : [];
    const activeBookings = safeBookings.filter(
      (b) => b && (b.room_id === roomId || !roomId) && b.booking_status !== 'cancelled'
    );

    activeBookings.forEach((b) => {
      if (!b?.check_in_date || !b?.check_out_date) return;
      const start = parseYMDToDate(b.check_in_date);
      const end = parseYMDToDate(b.check_out_date);

      // Booked nights include all nights from check-in up to night before check-out
      const curr = new Date(start);
      while (curr < end) {
        set.add(formatDateToYMD(curr));
        curr.setDate(curr.getDate() + 1);
      }
    });

    return set;
  }, [existingBookings, roomId]);

  // Check if a specific date string is already booked
  const isDateBooked = (dateStr: string): boolean => {
    return bookedDatesSet.has(dateStr);
  };

  // Check if a range has any booked dates in between
  const hasBookedDatesInRange = (startStr: string, endStr: string): boolean => {
    const start = parseYMDToDate(startStr);
    const end = parseYMDToDate(endStr);
    const curr = new Date(start);
    while (curr < end) {
      if (bookedDatesSet.has(formatDateToYMD(curr))) {
        return true;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return false;
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Build calendar matrix for currentMonth
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isBooked: boolean;
    }> = [];

    // Pad leading days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = formatDateToYMD(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isBooked: isDateBooked(dateStr)
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      const dateStr = formatDateToYMD(currDate);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isPast: dateStr < todayStr,
        isBooked: isDateBooked(dateStr)
      });
    }

    // Pad trailing days to complete 6-row or 5-row grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = formatDateToYMD(nextDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isBooked: isDateBooked(dateStr)
      });
    }

    return days;
  }, [currentMonth, todayStr, bookedDatesSet]);

  // Handle cell click
  const handleDateClick = (dateStr: string) => {
    if (dateStr < todayStr) return; // Cannot select past dates
    if (isDateBooked(dateStr)) return; // Cannot select booked dates

    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Step 1: User starts a new selection by choosing Check-in
      onSelectDates(dateStr, '');
    } else if (checkInDate && !checkOutDate) {
      // Step 2: User chooses Check-out
      if (dateStr === checkInDate) {
        // Same date clicked again: treat as check-in only
        return;
      }

      if (dateStr < checkInDate) {
        // User clicked an earlier date, make it the new check-in
        onSelectDates(dateStr, '');
      } else {
        // Check if there are booked dates in between
        if (hasBookedDatesInRange(checkInDate, dateStr)) {
          // Cannot span across booked dates!
          // Reset check-in to this new date
          onSelectDates(dateStr, '');
        } else {
          // Valid range selected!
          onSelectDates(checkInDate, dateStr);
        }
      }
    }
  };

  const handleResetDates = () => {
    onSelectDates('', '');
  };

  // Month header text
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const inD = parseYMDToDate(checkInDate);
    const outD = parseYMDToDate(checkOutDate);
    const diff = Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [checkInDate, checkOutDate]);

  // Check if current range has conflicts
  const conflictDetected = useMemo(() => {
    if (checkInDate && checkOutDate) {
      return hasBookedDatesInRange(checkInDate, checkOutDate);
    }
    return false;
  }, [checkInDate, checkOutDate, bookedDatesSet]);

  return (
    <div className="space-y-4">
      {/* Calendar Header with Navigation */}
      <div className="bg-white p-4 rounded-3xl border border-[#E5E2D9] shadow-2xs space-y-4">
        {/* Month Selector Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#5A5A40]" />
            <h4 className="font-serif italic font-medium text-base text-[#2C2C2C]">
              {monthName}
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-full hover:bg-[#F5F2ED] text-[#8C887D] hover:text-[#2C2C2C] border border-[#E5E2D9] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-full hover:bg-[#F5F2ED] text-[#8C887D] hover:text-[#2C2C2C] border border-[#E5E2D9] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center border-b border-[#F5F2ED] pb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
            <div key={idx} className="text-[10px] font-bold uppercase tracking-wider text-[#8C887D]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, index) => {
            const isToday = item.dateStr === todayStr;
            const isCheckIn = item.dateStr === checkInDate;
            const isCheckOut = item.dateStr === checkOutDate;

            // In selected range
            const isInSelectedRange =
              checkInDate &&
              checkOutDate &&
              item.dateStr > checkInDate &&
              item.dateStr < checkOutDate;

            // In hover range (when checkIn is chosen, hovering over candidate checkOut)
            const isInHoverRange =
              checkInDate &&
              !checkOutDate &&
              hoveredDate &&
              hoveredDate > checkInDate &&
              item.dateStr > checkInDate &&
              item.dateStr <= hoveredDate &&
              !hasBookedDatesInRange(checkInDate, hoveredDate);

            // Is cell disabled / unclickable
            const isDisabled = item.isPast || item.isBooked;

            return (
              <button
                key={index}
                type="button"
                disabled={isDisabled}
                onClick={() => handleDateClick(item.dateStr)}
                onMouseEnter={() => !isDisabled && setHoveredDate(item.dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  relative h-10 w-full rounded-xl flex flex-col items-center justify-center text-xs transition-all select-none
                  ${!item.isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                  ${
                    item.isPast
                      ? 'text-[#C5C2BA] cursor-not-allowed bg-transparent'
                      : item.isBooked
                      ? 'bg-rose-50/80 text-rose-800 border border-rose-200/80 font-medium cursor-not-allowed'
                      : isCheckIn || isCheckOut
                      ? 'bg-[#5A5A40] text-white font-bold shadow-2xs scale-95 z-10'
                      : isInSelectedRange
                      ? 'bg-[#EAE6DF] text-[#2C2C2C] font-semibold rounded-none first:rounded-l-xl last:rounded-r-xl'
                      : isInHoverRange
                      ? 'bg-[#F5F2ED] text-[#5A5A40] font-medium'
                      : 'hover:bg-[#F5F2ED] text-[#2C2C2C] hover:border-[#E5E2D9]'
                  }
                `}
              >
                {/* Day number */}
                <span className="leading-none text-xs">{item.dayNumber}</span>

                {/* Sub-labels / icons for booked or selected state */}
                {item.isBooked && (
                  <span className="text-[8px] uppercase tracking-tighter text-rose-600 font-bold leading-none mt-0.5">
                    Booked
                  </span>
                )}

                {isCheckIn && (
                  <span className="text-[7px] uppercase tracking-tighter text-[#E5D7C7] font-bold leading-none mt-0.5">
                    Check-in
                  </span>
                )}

                {isCheckOut && (
                  <span className="text-[7px] uppercase tracking-tighter text-[#E5D7C7] font-bold leading-none mt-0.5">
                    Check-out
                  </span>
                )}

                {/* Subtle indicator for today if not selected */}
                {isToday && !isCheckIn && !isCheckOut && !item.isBooked && (
                  <span className="w-1 h-1 rounded-full bg-[#C4A484] absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Calendar Legend */}
        <div className="pt-3 border-t border-[#F5F2ED] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8C887D]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-white border border-[#E5E2D9]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#5A5A40]" />
              <span className="font-medium text-[#2C2C2C]">Selected Stay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[8px] flex items-center justify-center">
                ×
              </span>
              <span className="text-rose-700 font-medium">Already Booked</span>
            </div>
          </div>

          {(checkInDate || checkOutDate) && (
            <button
              type="button"
              onClick={handleResetDates}
              className="text-[10px] uppercase tracking-wider font-bold text-[#8C887D] hover:text-[#2C2C2C] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Dates</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Stay Indicator & Overlap Warning */}
      <div className="bg-[#FDFCF9] p-3.5 rounded-2xl border border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F2ED] border border-[#E5E2D9] text-[#5A5A40] flex items-center justify-center shrink-0">
            <Moon className="w-4 h-4 text-[#5A5A40]" />
          </div>

          <div>
            <div className="font-bold text-[#2C2C2C]">
              {checkInDate && checkOutDate ? (
                <>
                  {checkInDate} <span className="text-[#8C887D]">→</span> {checkOutDate}
                </>
              ) : checkInDate ? (
                <>
                  Check-in: {checkInDate} <span className="text-[#8C887D] font-normal">(Now select your check-out date)</span>
                </>
              ) : (
                <span className="text-[#8C887D]">Click a date to select your check-in day</span>
              )}
            </div>

            <div className="text-[11px] text-[#8C887D]">
              {nights > 0 ? (
                <span>
                  Total length of stay: <strong className="text-[#5A5A40]">{nights} {nights === 1 ? 'night' : 'nights'}</strong>
                </span>
              ) : (
                <span>All booked nights for Room {roomNumber} are locked to prevent double-booking.</span>
              )}
            </div>
          </div>
        </div>

        {checkInDate && !checkOutDate && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F5F2ED] text-[#5A5A40] px-3 py-1 rounded-full border border-[#E5E2D9] animate-pulse">
            Step 2: Select Check-Out
          </span>
        )}
      </div>

      {conflictDetected && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Selected range overlaps with existing reservations. Please select available consecutive dates.</span>
        </div>
      )}
    </div>
  );
};
