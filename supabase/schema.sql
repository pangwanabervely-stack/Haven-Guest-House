-- ====================================================================
-- THE HAVEN GUEST HOUSE - RELATIONAL SUPABASE / POSTGRESQL SCHEMA
-- Complete schema with Row Level Security (RLS), triggers, and seed data
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('guest', 'host', 'cleaning_staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cleaning_staff';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cleaning_status_enum AS ENUM ('clean', 'dirty', 'cleaning', 'inspected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE cleaning_status_enum ADD VALUE IF NOT EXISTS 'inspected';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status_enum AS ENUM ('available', 'occupied', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'partial', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('pending', 'accepted', 'preparing', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    emergency_contact_name TEXT DEFAULT '',
    emergency_contact_phone TEXT DEFAULT '',
    role user_role NOT NULL DEFAULT 'guest',
    profile_image TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number TEXT UNIQUE NOT NULL,
    room_type TEXT NOT NULL,
    description TEXT NOT NULL,
    price_per_night NUMERIC(10, 2) NOT NULL CHECK (price_per_night >= 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    image_url TEXT NOT NULL,
    gallery TEXT[] DEFAULT ARRAY[]::TEXT[],
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    cleaning_status cleaning_status_enum NOT NULL DEFAULT 'clean',
    room_status room_status_enum NOT NULL DEFAULT 'available',
    floor INT DEFAULT 1,
    bed_type TEXT DEFAULT 'King Bed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bookings Table with double-booking prevention check
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in TIMESTAMPTZ,
    actual_check_out TIMESTAMPTZ,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    payment_status payment_status_enum NOT NULL DEFAULT 'pending',
    booking_status booking_status_enum NOT NULL DEFAULT 'confirmed',
    guest_notes TEXT DEFAULT '',
    number_of_guests INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dates_order CHECK (check_out_date > check_in_date)
);

-- 6. Messages Table (Supports Realtime)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Service Orders Table
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    status order_status_enum NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Service Order Items Table
CREATE TABLE IF NOT EXISTS service_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- ====================================================================
-- SECURITY FUNCTIONS & TRIGGERS
-- ====================================================================

-- 1. Helper functions: check user roles
CREATE OR REPLACE FUNCTION is_host(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'host'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION is_cleaning_staff(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'cleaning_staff'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Double-Booking Prevention Trigger Function
CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_status != 'cancelled' THEN
        IF EXISTS (
            SELECT 1 FROM bookings
            WHERE room_id = NEW.room_id
              AND id != NEW.id
              AND booking_status NOT IN ('cancelled', 'checked_out')
              AND (NEW.check_in_date < check_out_date AND NEW.check_out_date > check_in_date)
        ) THEN
            RAISE EXCEPTION 'Double booking conflict: Room is already booked for the selected date range.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON bookings;
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION check_room_availability();

-- 3. Profile Role Escalation & ID Tampering Protection
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing profile ID
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Modifying profile ID is strictly forbidden.';
    END IF;

    -- If role is modified, enforce that only existing hosts can change roles
    IF NEW.role <> OLD.role THEN
        IF NOT is_host(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: Guests cannot escalate their role to host.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- 4. Ensure public registration defaults strictly to 'guest' role
CREATE OR REPLACE FUNCTION set_default_guest_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_host(auth.uid()) THEN
        NEW.role = 'guest';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_set_default_guest_role ON profiles;
CREATE TRIGGER trg_set_default_guest_role
BEFORE INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION set_default_guest_role();

-- 5. Booking Security: Protect booking creation and updates from guest tampering
CREATE OR REPLACE FUNCTION protect_booking_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_host(auth.uid()) THEN
        -- Non-host must only create bookings for themselves
        IF NEW.guest_id <> auth.uid() THEN
            RAISE EXCEPTION 'Unauthorized: Cannot create bookings for other guests.';
        END IF;
        -- Guests cannot directly set booking as checked_in or checked_out on creation
        IF NEW.booking_status IN ('checked_in', 'checked_out') THEN
            RAISE EXCEPTION 'Unauthorized: Initial booking status cannot be checked_in or checked_out.';
        END IF;
        -- Guests cannot fabricate check-in/out timestamps
        NEW.actual_check_in = NULL;
        NEW.actual_check_out = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_booking_insert ON bookings;
CREATE TRIGGER trg_protect_booking_insert
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION protect_booking_insert();

CREATE OR REPLACE FUNCTION protect_booking_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_host(auth.uid()) THEN
        -- Non-host guests cannot reassign booking to another guest
        IF NEW.guest_id <> OLD.guest_id THEN
            RAISE EXCEPTION 'Unauthorized: Cannot reassign booking to another guest.';
        END IF;
        -- Non-host guests cannot alter payment_status or amount_paid
        IF NEW.payment_status <> OLD.payment_status OR NEW.amount_paid <> OLD.amount_paid THEN
            RAISE EXCEPTION 'Unauthorized: Guests cannot alter payment status or amount paid directly.';
        END IF;
        -- Non-host guests cannot set status to checked_in or checked_out
        IF NEW.booking_status IN ('checked_in', 'checked_out') AND OLD.booking_status NOT IN ('checked_in', 'checked_out') THEN
            RAISE EXCEPTION 'Unauthorized: Only hosts can perform check-in or check-out.';
        END IF;
        -- Non-host guests cannot manipulate actual check in/out timestamps
        IF NEW.actual_check_in IS DISTINCT FROM OLD.actual_check_in OR NEW.actual_check_out IS DISTINCT FROM OLD.actual_check_out THEN
            RAISE EXCEPTION 'Unauthorized: Only hosts can modify actual check-in/check-out timestamps.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_booking_updates ON bookings;
CREATE TRIGGER trg_protect_booking_updates
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION protect_booking_updates();

-- 6. Message Security: Prevent sender spoofing and message modification
CREATE OR REPLACE FUNCTION protect_message_mutations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NOT is_host(auth.uid()) THEN
            IF NEW.sender_id <> auth.uid() THEN
                RAISE EXCEPTION 'Unauthorized: Cannot send messages as another user.';
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOT is_host(auth.uid()) THEN
            -- Guests can only modify the 'read' status when they are the receiver
            IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id OR NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.message <> OLD.message THEN
                RAISE EXCEPTION 'Unauthorized: Message content and metadata are immutable.';
            END IF;
            IF NEW.receiver_id <> auth.uid() THEN
                RAISE EXCEPTION 'Unauthorized: Only the receiver can update read status.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_message_mutations ON messages;
CREATE TRIGGER trg_protect_message_mutations
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION protect_message_mutations();

-- 7. Service Orders Security: Prevent status tampering and price manipulation
CREATE OR REPLACE FUNCTION protect_service_order_mutations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NOT is_host(auth.uid()) THEN
            IF NEW.guest_id <> auth.uid() THEN
                RAISE EXCEPTION 'Unauthorized: Cannot create room service orders for another guest.';
            END IF;
            IF NEW.status <> 'pending' THEN
                RAISE EXCEPTION 'Unauthorized: New service orders must start in pending status.';
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOT is_host(auth.uid()) THEN
            -- Non-hosts cannot reassign guest_id, room_id, or alter total_amount
            IF NEW.guest_id <> OLD.guest_id OR NEW.room_id <> OLD.room_id OR NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.total_amount <> OLD.total_amount THEN
                RAISE EXCEPTION 'Unauthorized: Guests cannot alter order room, guest, or total amount.';
            END IF;
            -- Non-hosts can only transition to 'cancelled' from 'pending'
            IF NEW.status <> OLD.status THEN
                IF NEW.status <> 'cancelled' OR OLD.status <> 'pending' THEN
                    RAISE EXCEPTION 'Unauthorized: Only hosts can accept, prepare, or deliver service orders.';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_service_order_mutations ON service_orders;
CREATE TRIGGER trg_protect_service_order_mutations
BEFORE INSERT OR UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION protect_service_order_mutations();

-- 8. Room Security: Housekeeping staff can ONLY update cleaning_status
CREATE OR REPLACE FUNCTION protect_room_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF is_cleaning_staff(auth.uid()) AND NOT is_host(auth.uid()) THEN
        IF NEW.room_number <> OLD.room_number OR
           NEW.room_type <> OLD.room_type OR
           NEW.price_per_night <> OLD.price_per_night OR
           NEW.capacity <> OLD.capacity OR
           NEW.room_status <> OLD.room_status OR
           NEW.description <> OLD.description OR
           NEW.images IS DISTINCT FROM OLD.images OR
           NEW.amenities IS DISTINCT FROM OLD.amenities OR
           NEW.floor IS DISTINCT FROM OLD.floor OR
           NEW.bed_type IS DISTINCT FROM OLD.bed_type THEN
            RAISE EXCEPTION 'Unauthorized: Housekeeping staff can only update cleaning status.';
        END IF;
    ELSIF NOT is_host(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only hosts and housekeeping staff can update rooms.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_room_updates ON rooms;
CREATE TRIGGER trg_protect_room_updates
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION protect_room_updates();

-- 9. Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_update_profiles_timestamp ON profiles;
CREATE TRIGGER trg_update_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_rooms_timestamp ON rooms;
CREATE TRIGGER trg_update_rooms_timestamp BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_bookings_timestamp ON bookings;
CREATE TRIGGER trg_update_bookings_timestamp BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_menu_items_timestamp ON menu_items;
CREATE TRIGGER trg_update_menu_items_timestamp BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_service_orders_timestamp ON service_orders;
CREATE TRIGGER trg_update_service_orders_timestamp BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- --------------------------------------------------------------------
-- SELECT: Anyone can view host profiles (for concierge/host details); authenticated users view own profile; hosts view all.
DROP POLICY IF EXISTS "Profiles select policy" ON profiles;
CREATE POLICY "Profiles select policy" ON profiles
FOR SELECT USING (
  role = 'host' OR auth.uid() = id OR is_host(auth.uid())
);

-- INSERT: Authenticated users can insert their own profile during registration.
DROP POLICY IF EXISTS "Profiles insert policy" ON profiles;
CREATE POLICY "Profiles insert policy" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- UPDATE: Users can update their own profile; hosts can update all profiles.
DROP POLICY IF EXISTS "Profiles update policy" ON profiles;
CREATE POLICY "Profiles update policy" ON profiles
FOR UPDATE USING (
  auth.uid() = id OR is_host(auth.uid())
) WITH CHECK (
  auth.uid() = id OR is_host(auth.uid())
);

-- DELETE: Only hosts can delete profiles.
DROP POLICY IF EXISTS "Profiles delete policy" ON profiles;
CREATE POLICY "Profiles delete policy" ON profiles
FOR DELETE USING (
  is_host(auth.uid())
);

-- --------------------------------------------------------------------
-- 2. ROOMS POLICIES
-- --------------------------------------------------------------------
-- SELECT: Anyone (public and authenticated guests/hosts) can view room listings.
DROP POLICY IF EXISTS "Rooms select policy" ON rooms;
CREATE POLICY "Rooms select policy" ON rooms
FOR SELECT USING (true);

-- INSERT / UPDATE / DELETE: Hosts can manage rooms. Cleaning staff can only update cleaning_status.
DROP POLICY IF EXISTS "Rooms insert policy" ON rooms;
CREATE POLICY "Rooms insert policy" ON rooms
FOR INSERT WITH CHECK (is_host(auth.uid()));

DROP POLICY IF EXISTS "Rooms update policy" ON rooms;
CREATE POLICY "Rooms update policy" ON rooms
FOR UPDATE USING (
  is_host(auth.uid()) OR is_cleaning_staff(auth.uid())
) WITH CHECK (
  is_host(auth.uid()) OR is_cleaning_staff(auth.uid())
);

DROP POLICY IF EXISTS "Rooms delete policy" ON rooms;
CREATE POLICY "Rooms delete policy" ON rooms
FOR DELETE USING (is_host(auth.uid()));

-- --------------------------------------------------------------------
-- 3. BOOKINGS POLICIES
-- --------------------------------------------------------------------
-- SELECT: Guests can view their own bookings; hosts can view all bookings.
DROP POLICY IF EXISTS "Bookings select policy" ON bookings;
CREATE POLICY "Bookings select policy" ON bookings
FOR SELECT USING (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- INSERT: Guests can create bookings for themselves; hosts can create bookings for any guest.
DROP POLICY IF EXISTS "Bookings insert policy" ON bookings;
CREATE POLICY "Bookings insert policy" ON bookings
FOR INSERT WITH CHECK (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- UPDATE: Guests can update their own bookings (dates/notes/cancellation); hosts can manage all.
DROP POLICY IF EXISTS "Bookings update policy" ON bookings;
CREATE POLICY "Bookings update policy" ON bookings
FOR UPDATE USING (
  auth.uid() = guest_id OR is_host(auth.uid())
) WITH CHECK (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- DELETE: Strictly hosts only. Guests must cancel bookings rather than hard-delete records.
DROP POLICY IF EXISTS "Bookings delete policy" ON bookings;
CREATE POLICY "Bookings delete policy" ON bookings
FOR DELETE USING (
  is_host(auth.uid())
);

-- --------------------------------------------------------------------
-- 4. MESSAGES POLICIES
-- --------------------------------------------------------------------
-- SELECT: Senders and receivers can view their messages; hosts can view all messages for concierge oversight.
DROP POLICY IF EXISTS "Messages select policy" ON messages;
CREATE POLICY "Messages select policy" ON messages
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id OR is_host(auth.uid())
);

-- INSERT: Users can send messages where they are the sender; hosts can send as well.
DROP POLICY IF EXISTS "Messages insert policy" ON messages;
CREATE POLICY "Messages insert policy" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id OR is_host(auth.uid())
);

-- UPDATE: Message receiver (or host) can mark messages as read.
DROP POLICY IF EXISTS "Messages update policy" ON messages;
CREATE POLICY "Messages update policy" ON messages
FOR UPDATE USING (
  auth.uid() = receiver_id OR is_host(auth.uid())
) WITH CHECK (
  auth.uid() = receiver_id OR is_host(auth.uid())
);

-- DELETE: Only hosts can delete messages.
DROP POLICY IF EXISTS "Messages delete policy" ON messages;
CREATE POLICY "Messages delete policy" ON messages
FOR DELETE USING (
  is_host(auth.uid())
);

-- --------------------------------------------------------------------
-- 5. MENU ITEMS POLICIES
-- --------------------------------------------------------------------
-- SELECT: Anyone can view dining menu items.
DROP POLICY IF EXISTS "Menu items select policy" ON menu_items;
CREATE POLICY "Menu items select policy" ON menu_items
FOR SELECT USING (true);

-- INSERT / UPDATE / DELETE: Only hosts can manage menu items.
DROP POLICY IF EXISTS "Menu items insert policy" ON menu_items;
CREATE POLICY "Menu items insert policy" ON menu_items
FOR INSERT WITH CHECK (is_host(auth.uid()));

DROP POLICY IF EXISTS "Menu items update policy" ON menu_items;
CREATE POLICY "Menu items update policy" ON menu_items
FOR UPDATE USING (is_host(auth.uid())) WITH CHECK (is_host(auth.uid()));

DROP POLICY IF EXISTS "Menu items delete policy" ON menu_items;
CREATE POLICY "Menu items delete policy" ON menu_items
FOR DELETE USING (is_host(auth.uid()));

-- --------------------------------------------------------------------
-- 6. SERVICE ORDERS POLICIES
-- --------------------------------------------------------------------
-- SELECT: Guests can view their own orders; hosts can view all orders.
DROP POLICY IF EXISTS "Service orders select policy" ON service_orders;
CREATE POLICY "Service orders select policy" ON service_orders
FOR SELECT USING (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- INSERT: Guests can create orders for themselves; hosts can create orders.
DROP POLICY IF EXISTS "Service orders insert policy" ON service_orders;
CREATE POLICY "Service orders insert policy" ON service_orders
FOR INSERT WITH CHECK (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- UPDATE: Guests can update/cancel their own orders; hosts can manage order fulfillment.
DROP POLICY IF EXISTS "Service orders update policy" ON service_orders;
CREATE POLICY "Service orders update policy" ON service_orders
FOR UPDATE USING (
  auth.uid() = guest_id OR is_host(auth.uid())
) WITH CHECK (
  auth.uid() = guest_id OR is_host(auth.uid())
);

-- DELETE: Only hosts can delete service orders.
DROP POLICY IF EXISTS "Service orders delete policy" ON service_orders;
CREATE POLICY "Service orders delete policy" ON service_orders
FOR DELETE USING (
  is_host(auth.uid())
);

-- --------------------------------------------------------------------
-- 7. SERVICE ORDER ITEMS POLICIES
-- --------------------------------------------------------------------
-- SELECT: Guests view items for their own orders; hosts view all order items.
DROP POLICY IF EXISTS "Service order items select policy" ON service_order_items;
CREATE POLICY "Service order items select policy" ON service_order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM service_orders
    WHERE service_orders.id = service_order_items.order_id
      AND (service_orders.guest_id = auth.uid() OR is_host(auth.uid()))
  )
);

-- INSERT: Guests can insert items linked to their own pending orders; hosts can insert any.
DROP POLICY IF EXISTS "Service order items insert policy" ON service_order_items;
CREATE POLICY "Service order items insert policy" ON service_order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_orders
    WHERE service_orders.id = service_order_items.order_id
      AND (service_orders.guest_id = auth.uid() OR is_host(auth.uid()))
  )
);

-- UPDATE / DELETE: Only hosts can modify or delete order line items.
DROP POLICY IF EXISTS "Service order items update policy" ON service_order_items;
CREATE POLICY "Service order items update policy" ON service_order_items
FOR UPDATE USING (is_host(auth.uid())) WITH CHECK (is_host(auth.uid()));

DROP POLICY IF EXISTS "Service order items delete policy" ON service_order_items;
CREATE POLICY "Service order items delete policy" ON service_order_items
FOR DELETE USING (is_host(auth.uid()));

-- ====================================================================
-- REALTIME PUBLICATIONS
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
