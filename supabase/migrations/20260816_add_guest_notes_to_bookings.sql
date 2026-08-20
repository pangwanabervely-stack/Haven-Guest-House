-- ====================================================================
-- MIGRATION: Add guest_notes column to public.bookings table
-- Description: Adds optional guest notes / special requests column to bookings table
-- ====================================================================

-- 1. Safely add the column if it doesn't already exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_notes TEXT DEFAULT '';

-- 2. Add comment for clarity
COMMENT ON COLUMN public.bookings.guest_notes IS 'Special requests or notes provided by the guest during reservation';

-- 3. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
