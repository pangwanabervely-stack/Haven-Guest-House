export type UserRole = 'guest' | 'host' | 'cleaning_staff';

export type CleaningStatus = 'dirty' | 'in_progress' | 'clean' | 'inspected';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'delivered' | 'cancelled';
export type ServiceCategory = 'breakfast' | 'all_day_dining' | 'beverages' | 'housekeeping_wellness' | string;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  role: UserRole;
  profile_image?: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  room_type: 'Standard' | 'Deluxe' | 'Executive' | 'Family' | 'Suite' | string;
  description: string;
  price_per_night: number;
  capacity: number;
  image_url: string;
  gallery?: string[];
  amenities: string[];
  cleaning_status: CleaningStatus;
  room_status: RoomStatus;
  floor?: number;
  bed_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  room_id: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  actual_check_in?: string | null; // ISO timestamp
  actual_check_out?: string | null; // ISO timestamp
  total_amount: number;
  amount_paid: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  guest_notes?: string;
  number_of_guests?: number;
  created_at: string;
  updated_at: string;
  // Populated relations
  guest?: Profile;
  room?: Room;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  booking_id?: string | null;
  message: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: UserRole;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Breakfast' | 'Beverages' | 'Snacks' | 'Toiletries' | 'Towels' | 'Laundry' | 'Concierge' | string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  menu_item?: MenuItem;
}

export type ServicePaymentStatus = 'unpaid' | 'paid' | 'room_tab' | 'pending' | 'failed' | 'cancelled';

export interface ServiceOrder {
  id: string;
  guest_id: string;
  booking_id?: string | null;
  room_id: string;
  status: OrderStatus;
  payment_status?: ServicePaymentStatus;
  payment_method?: 'paynow' | 'room_tab' | 'cash' | string | null;
  total_amount: number;
  amount_paid?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  guest?: Profile;
  room?: Room;
  items: ServiceOrderItem[];
}

export interface DashboardStats {
  todayCheckIns: number;
  todayCheckOuts: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  pendingPaymentsCount: number;
  totalPendingPaymentAmount: number;
  totalCollectedRevenue: number;
  pendingOrdersCount: number;
  roomsToCleanCount: number;
  cleaningInProgressCount: number;
  totalRooms: number;
  occupancyRate: number;
}

export interface FeaturedOffer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'seasonal' | 'package' | 'midweek' | 'romance';
  discountType: 'percentage' | 'fixed' | 'package_perk';
  discountValue: number;
  discountLabel: string;
  badge: string;
  promoCode: string;
  inclusions: string[];
  validDates: string;
  minNights?: number;
  imageUrl: string;
  highlightPerk: string;
}

export interface Review {
  id: string;
  booking_id: string;
  guest_id: string;
  guest_name: string;
  room_id: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'service' | 'cleaning' | 'payment' | 'chat' | 'system';
  timestamp: string;
  read: boolean;
  linkView?: string;
  recipientRoles?: UserRole[];
  recipientId?: string;
  bookingId?: string;
}

export interface PaymentTransaction {
  id: string;
  booking_id?: string;
  service_order_id?: string;
  provider: 'paynow' | 'on_site';
  provider_reference: string;
  paynow_reference?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'disputed';
  poll_url?: string;
  redirect_url?: string;
  instructions?: string;
  method?: 'web' | 'ecocash' | 'onemoney' | 'cash' | 'card';
  created_at: string;
  updated_at?: string;
  paid_at?: string;
}

export interface PaynowInitiateResponse {
  success: boolean;
  reference: string;
  paynowReference?: string;
  redirectUrl?: string;
  pollUrl?: string;
  instructions?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  simulated?: boolean;
  message?: string;
  error?: string;
}

export interface PaynowStatusResponse {
  success: boolean;
  status: 'paid' | 'pending' | 'cancelled' | 'failed' | 'created' | 'sent';
  paid: boolean;
  amount: number;
  reference: string;
  paynowReference?: string;
  booking?: Booking;
  pollUrl?: string;
  message?: string;
  error?: string;
}

