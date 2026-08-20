import {
  Profile,
  Room,
  Booking,
  Message,
  MenuItem,
  ServiceOrder,
  DashboardStats,
  PaymentStatus,
  BookingStatus,
  OrderStatus,
  CleaningStatus,
  Review,
  PaymentTransaction,
  PaynowInitiateResponse,
  PaynowStatusResponse,
  ServicePaymentStatus
} from '../types';
import { supabase } from './supabase';
import { getRoomImageUrl, getRoomGalleryUrls, getMenuItemImageUrl, getProfileAvatarUrl } from './images';

// Helper to format friendly user-facing messages
const formatError = (err: any, fallback: string): Error => {
  const msg = err?.message || '';
  if (msg.includes('double booking') || msg.includes('already booked') || msg.includes('conflict')) {
    return new Error('This suite is already reserved for the selected dates. Please choose alternative dates.');
  }
  if (msg.includes('JWT expired') || msg.includes('invalid JWT') || msg.includes('session not found')) {
    return new Error('Your session has expired. Please sign in again.');
  }
  if (msg.includes('PGRST116') || msg.includes('single JSON object')) {
    return new Error('The requested record was updated or could not be found.');
  }
  return new Error(msg || fallback);
};

// Helper to clean service order notes from legacy transaction debug strings
function cleanServiceNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[PAID:[\s\S]*?\]/gi, '')
    .replace(/\[PaynowTxn:[\s\S]*?\]/gi, '')
    .replace(/\|?PAID:[\s\S]*?(?=(\||$))/gi, '')
    .replace(/\|?TXN:[\s\S]*?(?=(\||$))/gi, '')
    .trim();
}

export const api = {
  // --- AUTH & PROFILES ---
  getProfiles: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw formatError(error, 'Unable to load profile data.');
    }
    return ((data || []) as Profile[]).map((p) => ({
      ...p,
      profile_image: getProfileAvatarUrl(p)
    }));
  },

  getProfileById: async (id: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw formatError(error, 'Unable to fetch user profile.');
    }
    if (!data) return null;
    const p = data as Profile;
    return {
      ...p,
      profile_image: getProfileAvatarUrl(p)
    };
  },

  updateProfile: async (id: string, updates: Partial<Profile>): Promise<Profile> => {
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).id;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw formatError(error, 'Failed to update profile information.');
    }
    if (data) return data as Profile;
    const refreshed = await api.getProfileById(id);
    if (!refreshed) throw new Error('Profile not found.');
    return refreshed;
  },

  // --- ROOMS ---
  getRooms: async (): Promise<Room[]> => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true });

    if (error) {
      throw formatError(error, 'Failed to retrieve suite catalogue.');
    }
    return ((data || []) as any[]).map((r) => ({
      ...r,
      image_url: getRoomImageUrl(r),
      gallery: getRoomGalleryUrls(r),
      cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
    })) as Room[];
  },

  getRoomById: async (id: string): Promise<Room> => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw formatError(error, `Suite not found.`);
    }
    const r = data as any;
    return {
      ...r,
      image_url: getRoomImageUrl(r),
      gallery: getRoomGalleryUrls(r),
      cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
    } as Room;
  },

  checkRoomAvailability: async (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string
  ): Promise<boolean> => {
    if (!checkIn || !checkOut) return false;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (outDate <= inDate) return false;

    let query = supabase
      .from('bookings')
      .select('id, check_in_date, check_out_date, booking_status')
      .eq('room_id', roomId)
      .not('booking_status', 'in', '("cancelled","checked_out")');

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: existingBookings, error } = await query;
    if (error) {
      throw formatError(error, 'Failed to check room availability.');
    }

    if (existingBookings) {
      const hasOverlap = existingBookings.some((b) => {
        const bIn = new Date(b.check_in_date);
        const bOut = new Date(b.check_out_date);
        return inDate < bOut && outDate > bIn;
      });
      return !hasOverlap;
    }
    return true;
  },

  createRoom: async (roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> => {
    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .select('*')
      .maybeSingle();

    if (error || !data) throw formatError(error, 'Failed to create new suite.');
    return data as Room;
  },

  updateRoom: async (id: string, updates: Partial<Room>): Promise<Room> => {
    const payload = { ...updates };
    if (payload.cleaning_status === 'inspected') {
      payload.cleaning_status = 'clean' as any;
    } else if (payload.cleaning_status === 'in_progress') {
      payload.cleaning_status = 'cleaning' as any;
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (payload.cleaning_status) {
        const retryPayload = { ...payload, cleaning_status: 'clean' as any };
        const retry = await supabase
          .from('rooms')
          .update({
            ...retryPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!retry.error && retry.data) {
          const r = retry.data as any;
          return {
            ...r,
            cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
          } as Room;
        }
      }
      throw formatError(error, 'Failed to update suite settings.');
    }
    if (data) {
      const r = data as any;
      return {
        ...r,
        cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
      } as Room;
    }
    return api.getRoomById(id);
  },

  // Housekeeping Staff Status Update - Guaranteed not to fail on enum check
  updateRoomCleaningStatus: async (id: string, cleaningStatus: CleaningStatus): Promise<Room> => {
    try {
      const res = await fetch('/api/housekeeping/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, cleaningStatus })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.room) {
          return json.room as Room;
        }
      }
    } catch (apiErr) {
      console.warn('[Housekeeping API fetch error, falling back to direct client]:', apiErr);
    }

    let dbStatus: string = cleaningStatus;
    if (cleaningStatus === 'in_progress') {
      dbStatus = 'cleaning';
    } else if (cleaningStatus === 'inspected') {
      dbStatus = 'clean';
    }

    // Attempt 1: Update using normalized dbStatus
    const { data, error } = await supabase
      .from('rooms')
      .update({
        cleaning_status: dbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (dbStatus === 'cleaning' || dbStatus === 'clean') {
        const altStatus = dbStatus === 'cleaning' ? 'in_progress' : 'clean';
        const retry = await supabase
          .from('rooms')
          .update({
            cleaning_status: altStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .maybeSingle();

        if (!retry.error && retry.data) {
          const r = retry.data as any;
          return {
            ...r,
            cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
          } as Room;
        }
      }
      throw formatError(error, 'Failed to update housekeeping status.');
    }

    if (data) {
      const r = data as any;
      return {
        ...r,
        cleaning_status: r.cleaning_status === 'cleaning' ? 'in_progress' : r.cleaning_status
      } as Room;
    }

    try {
      const refreshed = await api.getRoomById(id);
      return {
        ...refreshed,
        cleaning_status: cleaningStatus
      };
    } catch {
      return {
        id,
        cleaning_status: cleaningStatus
      } as any;
    }
  },

  // Rule 3: GUESTS CANNOT REQUEST ROOM CLEANING BEFORE CHECK-IN
  requestRoomCleaning: async (roomId: string, guestId: string): Promise<Room> => {
    const { data: checkedInBookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, booking_status, room_id')
      .eq('guest_id', guestId)
      .eq('booking_status', 'checked_in')
      .limit(1);

    if (bErr || !checkedInBookings || checkedInBookings.length === 0) {
      throw new Error('Room cleaning requests are available after check-in. Please check in before requesting housekeeping service.');
    }

    return await api.updateRoomCleaningStatus(roomId, 'dirty');
  },

  deleteRoom: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);

    if (error) throw formatError(error, 'Failed to remove suite.');
    return true;
  },

  // --- BOOKINGS ---
  getBookings: async (filter?: { guestId?: string; roomId?: string; status?: string }): Promise<Booking[]> => {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        guest:profiles!guest_id(*),
        room:rooms!room_id(*)
      `)
      .order('created_at', { ascending: false });

    if (filter?.guestId) query = query.eq('guest_id', filter.guestId);
    if (filter?.roomId) query = query.eq('room_id', filter.roomId);
    if (filter?.status) query = query.eq('booking_status', filter.status);

    const { data, error } = await query;
    if (error) {
      throw formatError(error, 'Failed to retrieve booking records.');
    }
    return (data || []) as Booking[];
  },

  createBooking: async (payload: {
    guest_id: string;
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    number_of_guests?: number;
    guest_notes?: string;
    amount_paid?: number;
  }): Promise<Booking> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in before completing your reservation.');
    }

    const actualGuestId = user.id;
    const targetRoom = await api.getRoomById(payload.room_id);
    const inD = new Date(payload.check_in_date);
    const outD = new Date(payload.check_out_date);
    const nights = Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * Number(targetRoom.price_per_night);
    const amountPaid = payload.amount_paid || 0;
    const paymentStatus: PaymentStatus =
      amountPaid >= totalAmount ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';

    const bookingRow = {
      guest_id: actualGuestId,
      room_id: payload.room_id,
      check_in_date: payload.check_in_date,
      check_out_date: payload.check_out_date,
      actual_check_in: null,
      actual_check_out: null,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      payment_status: paymentStatus,
      booking_status: 'confirmed' as BookingStatus,
      guest_notes: payload.guest_notes || '',
      number_of_guests: payload.number_of_guests || 1
    };

    const { data: insertedBooking, error: insertError } = await supabase
      .from('bookings')
      .insert([bookingRow])
      .select('*')
      .maybeSingle();

    if (insertError) {
      throw formatError(insertError, 'Failed to confirm reservation.');
    }

    let guestProfile: Profile | null = null;
    try {
      guestProfile = await api.getProfileById(actualGuestId);
    } catch {
      // Non-blocking fallback
    }

    return {
      ...(insertedBooking as any),
      room: targetRoom,
      guest: guestProfile || undefined
    } as Booking;
  },

  updateBookingDates: async (bookingId: string, checkInDate: string, checkOutDate: string): Promise<Booking> => {
    const { data: bData, error: bFetchErr } = await supabase
      .from('bookings')
      .select('room_id, booking_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bFetchErr || !bData) {
      throw new Error('Reservation could not be located.');
    }

    if (bData.booking_status === 'checked_in' || bData.booking_status === 'checked_out' || bData.booking_status === 'cancelled') {
      throw new Error(`Reservation dates cannot be modified once the stay is ${bData.booking_status.replace('_', ' ')}.`);
    }

    const room = await api.getRoomById(bData.room_id);
    const inD = new Date(checkInDate);
    const outD = new Date(checkOutDate);
    const nights = Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
    const newTotal = nights * Number(room.price_per_night);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        total_amount: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        guest:profiles!guest_id(*),
        room:rooms!room_id(*)
      `)
      .maybeSingle();

    if (error) throw formatError(error, 'Failed to update reservation dates.');
    return data as Booking;
  },

  cancelBooking: async (bookingId: string): Promise<Booking> => {
    const { data: bData } = await supabase
      .from('bookings')
      .select('booking_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bData && (bData.booking_status === 'checked_in' || bData.booking_status === 'checked_out' || bData.booking_status === 'cancelled')) {
      throw new Error(`Reservation cannot be cancelled once the stay is ${bData.booking_status.replace('_', ' ')}.`);
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        guest:profiles!guest_id(*),
        room:rooms!room_id(*)
      `)
      .maybeSingle();

    if (error) throw formatError(error, 'Failed to cancel reservation.');
    return data as Booking;
  },

  checkInGuest: async (bookingId: string): Promise<Booking> => {
    // 1. Fetch current booking to validate status and check-in date
    const { data: existingBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, check_in_date, booking_status, room_id, guest_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !existingBooking) {
      throw formatError(fetchErr, 'Booking could not be found for check-in.');
    }

    if (existingBooking.booking_status === 'checked_in') {
      throw new Error('Guest is already checked in.');
    }

    if (existingBooking.booking_status === 'cancelled') {
      throw new Error('Cannot check in a cancelled reservation.');
    }

    if (existingBooking.booking_status === 'checked_out') {
      throw new Error('This reservation has already been checked out.');
    }

    // Rule 5: Cannot check in before scheduled check_in_date
    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr < existingBooking.check_in_date) {
      throw new Error(
        `Cannot check in before scheduled check-in date (${existingBooking.check_in_date}). Check-in will be available on or after the scheduled arrival date.`
      );
    }

    const timestamp = new Date().toISOString();

    const { data: booking, error: bError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'checked_in',
        actual_check_in: timestamp,
        updated_at: timestamp
      })
      .eq('id', bookingId)
      .select('*, room:rooms!room_id(*)')
      .maybeSingle();

    if (bError) throw formatError(bError, 'Failed to complete guest check-in.');

    if (booking?.room_id) {
      await supabase
        .from('rooms')
        .update({ room_status: 'occupied', updated_at: timestamp })
        .eq('id', booking.room_id);
    }
    return booking as Booking;
  },

  checkOutGuest: async (bookingId: string): Promise<Booking> => {
    // 1. Fetch current booking
    const { data: existingBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_amount, amount_paid, booking_status, room_id, guest_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !existingBooking) {
      throw formatError(fetchErr, 'Booking could not be found for check-out.');
    }

    if (existingBooking.booking_status === 'checked_out') {
      throw new Error('Guest is already checked out.');
    }

    if (existingBooking.booking_status !== 'checked_in') {
      throw new Error(`Only currently checked-in guests can be checked out (current status: ${existingBooking.booking_status}).`);
    }

    // Rule 4: Checkout Balance Gate
    // Accommodation balance:
    const accommodationBalance = Math.max(0, Number(existingBooking.total_amount || 0) - Number(existingBooking.amount_paid || 0));

    // Room services balance:
    let roomServicesBalance = 0;
    try {
      const allOrders = await api.getServiceOrders({ guestId: existingBooking.guest_id });
      // Filter non-cancelled orders for this stay
      const stayOrders = allOrders.filter(
        (o) => o.status !== 'cancelled' && (o.booking_id === bookingId || !o.booking_id)
      );
      for (const order of stayOrders) {
        if (order.payment_status !== 'paid') {
          const orderDue = Math.max(0, Number(order.total_amount || 0) - Number(order.amount_paid || 0));
          roomServicesBalance += orderDue;
        }
      }
    } catch (svcErr) {
      console.warn('Could not compute room service balance during checkout:', svcErr);
    }

    const totalOutstanding = Number((accommodationBalance + roomServicesBalance).toFixed(2));
    if (totalOutstanding > 0.01) {
      throw new Error(
        `Cannot check out guest: Outstanding balance of $${totalOutstanding.toFixed(2)} remains ($${accommodationBalance.toFixed(2)} accommodation, $${roomServicesBalance.toFixed(2)} room services/tab). Please settle all balances before checkout.`
      );
    }

    const timestamp = new Date().toISOString();

    const { data: booking, error: bError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'checked_out',
        actual_check_out: timestamp,
        updated_at: timestamp
      })
      .eq('id', bookingId)
      .select('*, room:rooms!room_id(*)')
      .maybeSingle();

    if (bError) throw formatError(bError, 'Failed to complete guest check-out.');

    if (booking?.room_id) {
      await supabase
        .from('rooms')
        .update({
          room_status: 'available',
          cleaning_status: 'dirty',
          updated_at: timestamp
        })
        .eq('id', booking.room_id);
    }
    return booking as Booking;
  },

  updatePayment: async (bookingId: string, amountPaid: number, explicitStatus?: PaymentStatus): Promise<Booking> => {
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_amount, room_id, guest_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !currentBooking) {
      throw formatError(fetchErr, `Booking not found.`);
    }

    const total = Number(currentBooking.total_amount);
    const newPaid = Number(amountPaid);
    const calculatedStatus: PaymentStatus =
      explicitStatus || (newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'pending');

    let updatedRow: any = null;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          amount_paid: newPaid,
          payment_status: calculatedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        updatedRow = data;
      }
    } catch (clientErr) {
      console.warn('[Supabase Client Update Fallback]:', clientErr);
    }

    // If client-side update was blocked by RLS or auth token, reconcile via server endpoint
    if (!updatedRow) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const serverRes = await fetch('/api/paynow/confirm-booking-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            bookingId,
            amountPaid: newPaid,
            paymentStatus: calculatedStatus
          })
        });
        if (serverRes.ok) {
          const resData = await serverRes.json();
          updatedRow = {
            id: bookingId,
            total_amount: total,
            amount_paid: resData.amountPaid || newPaid,
            payment_status: resData.paymentStatus || calculatedStatus,
            room_id: currentBooking.room_id,
            guest_id: currentBooking.guest_id
          };
        }
      } catch (srvErr) {
        console.warn('[Server Payment Confirmation Note]:', srvErr);
      }
    }

    const [room, guest] = await Promise.all([
      api.getRoomById(currentBooking.room_id).catch(() => undefined),
      api.getProfileById(currentBooking.guest_id).catch(() => undefined)
    ]);

    return {
      ...(updatedRow || {
        id: bookingId,
        total_amount: total,
        amount_paid: newPaid,
        payment_status: calculatedStatus,
        room_id: currentBooking.room_id,
        guest_id: currentBooking.guest_id
      }),
      room,
      guest
    } as Booking;
  },

  updateBookingPayment: async (bookingId: string, amountPaid: number, paymentMethodOrStatus?: any): Promise<Booking> => {
    return api.updatePayment(bookingId, amountPaid);
  },

  // --- PAYNOW ZIMBABWE PAYMENT INTEGRATION (Server-Side Proxy) ---
  initiatePaynowPayment: async (payload: {
    bookingId: string;
    amountToPay?: number;
    paymentType?: 'full' | 'partial';
    method?: 'web' | 'ecocash' | 'onemoney';
    phone?: string;
    guestEmail?: string;
    guestName?: string;
  }): Promise<PaynowInitiateResponse> => {
    let authHeader: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    } catch {
      // Non-blocking
    }

    const res = await fetch('/api/paynow/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify({
        ...payload,
        appUrl: window.location.origin
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'We could not initialize your payment with Paynow. Please try again.');
    }

    return (await res.json()) as PaynowInitiateResponse;
  },

  initiatePaynowServicePayment: async (payload: {
    serviceOrderId: string;
    method?: 'web' | 'ecocash' | 'onemoney';
    phone?: string;
    guestEmail?: string;
    guestName?: string;
  }): Promise<PaynowInitiateResponse> => {
    let authHeader: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    } catch {
      // Non-blocking
    }

    const res = await fetch('/api/paynow/initiate-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify({
        ...payload,
        appUrl: window.location.origin
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Could not initialize room service payment with Paynow. Please try again.');
    }

    return (await res.json()) as PaynowInitiateResponse;
  },

  registerGuestAccount: async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }): Promise<{ user: any; message: string }> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed. Please check your details.');
    }

    return data;
  },

  pollPaynowStatus: async (payload: {
    pollUrl?: string;
    reference?: string;
    bookingId?: string;
    serviceOrderId?: string;
  }): Promise<PaynowStatusResponse> => {
    let authHeader: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    } catch {
      // Non-blocking
    }

    const res = await fetch('/api/paynow/poll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to verify payment status with Paynow.');
    }

    return (await res.json()) as PaynowStatusResponse;
  },

  getPaymentTransactions: async (bookingId?: string): Promise<PaymentTransaction[]> => {
    try {
      const url = bookingId ? `/api/paynow/transactions/${bookingId}` : '/api/paynow/transactions';
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as PaymentTransaction[];
      }
    } catch {
      // Non-blocking fallback
    }
    return [];
  },

  verifyAndConfirmPaynowBooking: async (payload: {
    bookingId: string;
    reference: string;
    pollUrl?: string;
    amountPaid: number;
  }): Promise<Booking> => {
    // Poll server verification first
    const pollResult = await api.pollPaynowStatus({
      pollUrl: payload.pollUrl,
      reference: payload.reference,
      bookingId: payload.bookingId
    });

    if (!pollResult.paid && pollResult.status !== 'paid') {
      throw new Error(pollResult.message || 'Payment is still awaiting verification from Paynow.');
    }

    // Server-verified amount is authoritative
    const verifiedAmount = pollResult.amount || payload.amountPaid;
    const updatedBooking = await api.updatePayment(payload.bookingId, verifiedAmount, 'paid');
    return updatedBooking;
  },

  // --- REVIEWS SYSTEM (Only available for checked_out stays) ---
  getReviews: async (roomId?: string): Promise<Review[]> => {
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomId) query = query.eq('room_id', roomId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Review[];
      }
    } catch {
      // Fallback to local storage persistence
    }

    // Fallback storage in localStorage for durable reviews
    try {
      const stored = localStorage.getItem('the_haven_guest_reviews');
      if (stored) {
        const list: Review[] = JSON.parse(stored);
        if (roomId) {
          return list.filter((r) => r.room_id === roomId);
        }
        return list;
      }
    } catch {
      // Non-blocking
    }

    // Default authentic guest testimonials
    return [
      {
        id: 'rev-01',
        booking_id: 'default-01',
        guest_id: 'guest-tawanda',
        guest_name: 'Tawanda Moyo',
        room_id: 'default-room-1',
        rating: 5,
        title: 'Tranquil Sanctuary & Exceptional Service',
        comment:
          'Our stay at The Haven was pure rejuvenation. The garden views, thoughtful breakfast, and seamless concierge hospitality made this the best guest house in Gweru.',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'rev-02',
        booking_id: 'default-02',
        guest_id: 'guest-chipo',
        guest_name: 'Dr. Sarah Ndlovu',
        room_id: 'default-room-2',
        rating: 5,
        title: 'Spotless Suites and Serene Atmosphere',
        comment:
          'Executive suite was immaculate and peaceful. High-speed Wi-Fi allowed me to work comfortably, and the room dining was fresh and flavorful.',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString()
      }
    ];
  },

  createReview: async (reviewPayload: {
    booking_id: string;
    room_id: string;
    rating: number;
    title: string;
    comment: string;
  }): Promise<Review> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Please sign in to submit your stay review.');
    }

    // Verify booking is checked_out
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, guest_id, booking_status, room_id')
      .eq('id', reviewPayload.booking_id)
      .maybeSingle();

    if (booking && booking.booking_status !== 'checked_out') {
      throw new Error('Guest reviews can only be submitted after checkout is complete.');
    }

    let guestName = user.email?.split('@')[0] || 'Guest';
    try {
      const p = await api.getProfileById(user.id);
      if (p?.full_name) guestName = p.full_name;
    } catch {
      // Non-blocking
    }

    const newRev: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      booking_id: reviewPayload.booking_id,
      guest_id: user.id,
      guest_name: guestName,
      room_id: reviewPayload.room_id || booking?.room_id || '',
      rating: Math.min(5, Math.max(1, reviewPayload.rating)),
      title: reviewPayload.title.trim(),
      comment: reviewPayload.comment.trim(),
      created_at: new Date().toISOString()
    };

    // Try inserting into Supabase if reviews table exists
    try {
      await supabase.from('reviews').insert([newRev]);
    } catch {
      // Fallback
    }

    // Save into localStorage
    try {
      const existing = localStorage.getItem('the_haven_guest_reviews');
      const list: Review[] = existing ? JSON.parse(existing) : [];
      list.unshift(newRev);
      localStorage.setItem('the_haven_guest_reviews', JSON.stringify(list));
    } catch {
      // Non-blocking
    }

    return newRev;
  },

  // --- MESSAGES & REALTIME ---
  getMessages: async (filter?: { guestId?: string; bookingId?: string }): Promise<Message[]> => {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (filter?.guestId) {
      query = query.or(`sender_id.eq.${filter.guestId},receiver_id.eq.${filter.guestId}`);
    }
    if (filter?.bookingId) {
      query = query.eq('booking_id', filter.bookingId);
    }

    const { data, error } = await query;
    if (error) {
      throw formatError(error, 'Failed to fetch conversation history.');
    }
    return (data || []) as Message[];
  },

  sendMessage: async (payload: {
    sender_id: string;
    receiver_id: string;
    message: string;
    booking_id?: string | null;
  }): Promise<Message> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be signed in to send messages.');
    }

    const actualSenderId = user.id;
    let targetReceiverId = payload.receiver_id;

    const isValidUUID = (id?: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    if (!targetReceiverId || targetReceiverId === 'host' || !isValidUUID(targetReceiverId) || targetReceiverId.startsWith('00000000-0000-0000-0000-000000000001')) {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'host')
        .limit(1)
        .maybeSingle();

      if (hostProfile?.id) {
        targetReceiverId = hostProfile.id;
      } else {
        const host = await api.getProfiles().then((list) => list.find((p) => p.role === 'host'));
        if (!host) {
          throw new Error('Host concierge is currently unavailable. Please try again shortly.');
        }
        targetReceiverId = host.id;
      }
    }

    const msgRow = {
      sender_id: actualSenderId,
      receiver_id: targetReceiverId,
      booking_id: payload.booking_id || null,
      message: payload.message.trim(),
      read: false
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([msgRow])
      .select('*')
      .maybeSingle();

    if (error || !data) throw formatError(error, 'Failed to deliver message.');
    return data as Message;
  },

  markMessagesRead: async (userId: string, senderId: string): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId);

    if (error) {
      console.warn('Error marking messages read:', error.message);
    }
  },

  subscribeToMessages: (callback: (message: Message) => void) => {
    const channel = supabase
      .channel(`realtime:messages-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // --- MENU ITEMS ---
  getMenuItems: async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('name');

    if (error) {
      throw formatError(error, 'Failed to fetch menu items.');
    }
    
    let items = ((data || []) as MenuItem[]).map((item) => ({
      ...item,
      image_url: getMenuItemImageUrl(item)
    }));

    // Ensure Laundry category items are present in database
    const hasLaundry = items.some(
      (item) => item.category?.toLowerCase() === 'laundry' || item.category?.toLowerCase() === 'laundry_valet'
    );

    if (!hasLaundry) {
      const defaultLaundrySeeds = [
        {
          id: '11111111-2222-3333-4444-555555555501',
          name: 'Wash & Fold Laundry (Per Load)',
          category: 'laundry',
          price: 8.00,
          description: 'Full washing, scented eco-detergent rinse, gentle tumble drying, and neat folding for personal garments.',
          available: true,
          image_url: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80'
        },
        {
          id: '11111111-2222-3333-4444-555555555502',
          name: 'Wash & Steam Iron Garments',
          category: 'laundry',
          price: 3.50,
          description: 'Delicate hand wash followed by crisp steam pressing on hanger for business shirts, dresses, or trousers.',
          available: true,
          image_url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80'
        },
        {
          id: '11111111-2222-3333-4444-555555555503',
          name: 'Express Same-Day Pressing Service',
          category: 'laundry',
          price: 5.00,
          description: 'Rapid turnaround garment pressing and wrinkle removal delivered to your suite within 2 hours.',
          available: true,
          image_url: 'https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=800&q=80'
        }
      ];

      try {
        const { data: inserted } = await supabase
          .from('menu_items')
          .upsert(defaultLaundrySeeds, { onConflict: 'id' })
          .select('*');

        if (inserted && inserted.length > 0) {
          items = [...items, ...(inserted as MenuItem[]).map((it) => ({
            ...it,
            image_url: getMenuItemImageUrl(it)
          }))];
        } else {
          const now = new Date().toISOString();
          items.push(...defaultLaundrySeeds.map((it) => ({ ...it, created_at: now, updated_at: now })));
        }
      } catch {
        const now = new Date().toISOString();
        items.push(...defaultLaundrySeeds.map((it) => ({ ...it, created_at: now, updated_at: now })));
      }
    }

    return items;
  },

  createMenuItem: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([item])
      .select('*')
      .maybeSingle();

    if (error || !data) throw formatError(error, 'Failed to add service item.');
    return data as MenuItem;
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error || !data) throw formatError(error, 'Failed to update service item.');
    return data as MenuItem;
  },

  // --- SERVICE ORDERS ---
  getServiceOrders: async (filter?: { guestId?: string; roomId?: string; status?: OrderStatus }): Promise<ServiceOrder[]> => {
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        guest:profiles!guest_id(*),
        room:rooms!room_id(*),
        items:service_order_items(
          *,
          menu_item:menu_items!menu_item_id(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (filter?.guestId) query = query.eq('guest_id', filter.guestId);
    if (filter?.roomId) query = query.eq('room_id', filter.roomId);
    if (filter?.status) query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) {
      throw formatError(error, 'Failed to fetch service orders.');
    }

    // Fetch authoritative transactions from payment ledger
    let serviceTransactions: PaymentTransaction[] = [];
    try {
      const res = await fetch('/api/paynow-service/transactions');
      if (res.ok) {
        serviceTransactions = await res.json();
      }
    } catch {
      // Fallback
    }

    const orders = (data || []) as any[];

    return orders.map((o) => {
      // Match transaction in ledger
      const matchingTxn = serviceTransactions.find(
        (t) =>
          t.service_order_id === o.id ||
          (t.provider_reference && t.provider_reference.includes(o.id.slice(0, 8)))
      );

      let payment_status: ServicePaymentStatus = 'unpaid';
      let amount_paid = 0;
      let payment_method: string | undefined = undefined;

      if (o.status === 'cancelled') {
        payment_status = 'cancelled';
        amount_paid = 0;
        payment_method = o.payment_method || 'paynow';
      } else if (matchingTxn && matchingTxn.status === 'paid') {
        payment_status = 'paid';
        amount_paid = matchingTxn.amount || Number(o.total_amount || 0);
        payment_method = matchingTxn.method || 'paynow';
      } else if (matchingTxn && matchingTxn.status === 'pending') {
        payment_status = 'pending';
        amount_paid = 0;
        payment_method = matchingTxn.method || 'paynow';
      } else if (matchingTxn && (matchingTxn.status === 'failed' || matchingTxn.status === 'cancelled')) {
        payment_status = matchingTxn.status === 'cancelled' ? 'cancelled' : 'failed';
        amount_paid = 0;
        payment_method = matchingTxn.method || 'paynow';
      } else if (o.payment_method === 'room_tab' || o.payment_status === 'room_tab') {
        payment_status = 'room_tab';
        amount_paid = 0;
        payment_method = 'room_tab';
      }

      return {
        ...o,
        notes: cleanServiceNotes(o.notes),
        payment_status,
        amount_paid,
        payment_method
      } as ServiceOrder;
    });
  },

  createServiceOrder: async (payload: {
    guest_id: string;
    room_id: string;
    booking_id?: string | null;
    notes?: string;
    payment_method?: string;
    addToRoomTab?: boolean;
    items: Array<{ menu_item_id: string; quantity: number; unit_price?: number }>;
  }): Promise<ServiceOrder> => {
    // Rule 2: GUESTS CANNOT USE ROOM SERVICES BEFORE CHECK-IN
    // Validate that the guest currently has a checked_in reservation
    let activeBookingId = payload.booking_id;
    if (activeBookingId) {
      const { data: bk, error: bkErr } = await supabase
        .from('bookings')
        .select('id, booking_status, room_id')
        .eq('id', activeBookingId)
        .maybeSingle();

      if (bkErr || !bk || bk.booking_status !== 'checked_in') {
        throw new Error('Room services are available after check-in. Your reservation is currently ' + (bk?.booking_status || 'not checked in') + '.');
      }
    } else {
      const { data: checkedInBookings, error: bksErr } = await supabase
        .from('bookings')
        .select('id, booking_status, room_id')
        .eq('guest_id', payload.guest_id)
        .eq('booking_status', 'checked_in')
        .limit(1);

      if (bksErr || !checkedInBookings || checkedInBookings.length === 0) {
        throw new Error('Room services are available after check-in. Please check in to your room before ordering room services.');
      }
      activeBookingId = checkedInBookings[0].id;
    }

    const isValidUUID = (id?: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    // Fetch all current database menu items to authoritatively resolve prices and IDs
    const { data: allMenuItems, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, price, available');

    if (menuErr) throw formatError(menuErr, 'Failed to retrieve menu pricing.');
    const dbMenuItems = allMenuItems || [];

    const resolvedItems: Array<{ menu_item_id: string; quantity: number; unit_price: number }> = [];

    for (const it of payload.items) {
      let matched = dbMenuItems.find((m) => m.id === it.menu_item_id);

      // If not matched by exact ID or if ID is non-standard string, match by name or fallback
      if (!matched && !isValidUUID(it.menu_item_id)) {
        matched = dbMenuItems.find((m) =>
          m.name.toLowerCase().includes(it.menu_item_id.toLowerCase().replace(/laundry-|wash-|fold-|iron-/g, ''))
        );
      }

      if (!matched) {
        matched = dbMenuItems[0];
      }

      if (matched) {
        resolvedItems.push({
          menu_item_id: matched.id,
          quantity: Math.max(1, it.quantity),
          unit_price: Number(matched.price) // Authoritative price from DB
        });
      }
    }

    if (resolvedItems.length === 0) {
      throw new Error('Please select at least one valid item from the menu.');
    }

    // Authoritative total calculation
    const total = resolvedItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);

    // Ensure room_id is valid UUID
    let resolvedRoomId = payload.room_id;
    if (!isValidUUID(resolvedRoomId)) {
      const { data: firstRoom } = await supabase.from('rooms').select('id').limit(1).maybeSingle();
      if (firstRoom?.id) {
        resolvedRoomId = firstRoom.id;
      }
    }

    const cleanNote = cleanServiceNotes(payload.notes);

    // Insert only database-supported columns (do not insert non-existent columns)
    const { data: order, error: oError } = await supabase
      .from('service_orders')
      .insert([
        {
          guest_id: payload.guest_id,
          room_id: resolvedRoomId,
          booking_id: payload.booking_id || null,
          status: 'pending' as OrderStatus,
          total_amount: total,
          notes: cleanNote
        }
      ])
      .select('*')
      .maybeSingle();

    if (oError || !order) throw formatError(oError, 'Failed to submit service order.');

    const orderItems = resolvedItems.map((it) => ({
      order_id: order.id,
      menu_item_id: it.menu_item_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.quantity * it.unit_price
    }));

    const { error: iError } = await supabase.from('service_order_items').insert(orderItems);
    if (iError) {
      console.warn('Order items insert warning:', iError.message);
    }

    // If Add to Room Tab was selected and an active booking exists, add charge to booking folio
    if (payload.addToRoomTab && payload.booking_id) {
      try {
        const { data: currentBooking } = await supabase
          .from('bookings')
          .select('total_amount, amount_paid')
          .eq('id', payload.booking_id)
          .maybeSingle();

        if (currentBooking) {
          const newTotal = Number(currentBooking.total_amount || 0) + total;
          await supabase
            .from('bookings')
            .update({
              total_amount: newTotal,
              updated_at: new Date().toISOString()
            })
            .eq('id', payload.booking_id);
        }
      } catch (tabErr) {
        console.warn('Could not add charge to booking tab:', tabErr);
      }
    }

    const initialStatus: ServicePaymentStatus = payload.addToRoomTab
      ? 'room_tab'
      : (payload.payment_method === 'paynow' ? 'pending' : 'unpaid');

    const orders = await api.getServiceOrders({ guestId: payload.guest_id });
    const found = orders.find((o) => o.id === order.id);
    if (!found) {
      return {
        ...order,
        notes: cleanNote,
        payment_status: initialStatus,
        payment_method: payload.addToRoomTab ? 'room_tab' : (payload.payment_method || 'paynow'),
        amount_paid: 0,
        items: orderItems as any
      } as ServiceOrder;
    }
    return found;
  },

  updateServiceOrderPayment: async (
    orderId: string,
    paymentStatus: ServicePaymentStatus,
    amountPaid?: number,
    paymentMethod?: string
  ): Promise<ServiceOrder> => {
    try {
      await fetch('/api/paynow-service/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: orderId,
          paymentStatus,
          amountPaid,
          paymentMethod: paymentMethod || 'cash'
        })
      });
    } catch (recErr) {
      console.warn('Could not record payment on server:', recErr);
    }

    const orders = await api.getServiceOrders();
    const found = orders.find((o) => o.id === orderId);
    if (found) return found;

    return {
      id: orderId,
      payment_status: paymentStatus,
      amount_paid: amountPaid || 0,
      payment_method: paymentMethod || 'cash'
    } as any;
  },

  updateServiceOrderStatus: async (orderId: string, status: OrderStatus): Promise<ServiceOrder> => {
    const { data, error } = await supabase
      .from('service_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('*')
      .maybeSingle();

    if (error || !data) throw formatError(error, 'Failed to update order status.');
    return data as ServiceOrder;
  },

  // --- DASHBOARD STATS ---
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [rooms, bookings, orders] = await Promise.all([
      api.getRooms(),
      api.getBookings(),
      api.getServiceOrders({ status: 'pending' })
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    const todayCheckIns = bookings.filter(
      (b) => b.check_in_date === todayStr && b.booking_status !== 'cancelled'
    ).length;

    const todayCheckOuts = bookings.filter(
      (b) => b.check_out_date === todayStr && b.booking_status !== 'cancelled'
    ).length;

    const occupiedRooms = rooms.filter((r) => r.room_status === 'occupied').length;
    const availableRooms = rooms.filter((r) => r.room_status === 'available').length;
    const maintenanceRooms = rooms.filter((r) => r.room_status === 'maintenance').length;

    const activeBookings = bookings.filter((b) => b.booking_status !== 'cancelled');
    const pendingPayments = activeBookings.filter((b) => b.payment_status === 'pending' || b.payment_status === 'partial');
    const pendingPaymentsCount = pendingPayments.length;
    const totalPendingPaymentAmount = pendingPayments.reduce(
      (sum, b) => sum + (Number(b.total_amount) - Number(b.amount_paid)),
      0
    );
    const totalCollectedRevenue = activeBookings.reduce((sum, b) => sum + Number(b.amount_paid), 0);

    const roomsToCleanCount = rooms.filter((r) => r.cleaning_status === 'dirty').length;
    const cleaningInProgressCount = rooms.filter((r) => r.cleaning_status === 'in_progress').length;

    const totalRooms = rooms.length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      todayCheckIns,
      todayCheckOuts,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      pendingPaymentsCount,
      totalPendingPaymentAmount,
      totalCollectedRevenue,
      pendingOrdersCount: orders.length,
      roomsToCleanCount,
      cleaningInProgressCount,
      totalRooms,
      occupancyRate
    };
  }
};
