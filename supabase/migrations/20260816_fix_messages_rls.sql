-- ====================================================================
-- MIGRATION: Ensure Messages Table Row Level Security (RLS) Policies
-- Description: 
-- 1. Enables RLS on public.messages
-- 2. Allows guests to INSERT messages only where sender_id = auth.uid()
-- 3. Allows hosts to INSERT messages as host/concierge
-- 4. Allows senders, receivers, and hosts to SELECT messages
-- 5. Allows receivers or hosts to UPDATE (e.g. mark read)
-- ====================================================================

-- 1. Ensure RLS is active on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing policies
DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
DROP POLICY IF EXISTS "Messages delete policy" ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;

-- 3. INSERT POLICY
-- Allows authenticated guests to insert messages where sender_id equals their auth.uid()
-- Allows hosts to insert messages
CREATE POLICY "Messages insert policy" ON public.messages
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = sender_id)
  OR
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'host'
  ))
);

-- 4. SELECT POLICY
-- Senders and receivers can view their own messages; hosts can view conversations
CREATE POLICY "Messages select policy" ON public.messages
FOR SELECT USING (
  auth.uid() = sender_id 
  OR auth.uid() = receiver_id 
  OR (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'host'
  ))
);

-- 5. UPDATE POLICY (e.g., mark as read)
CREATE POLICY "Messages update policy" ON public.messages
FOR UPDATE USING (
  auth.uid() = receiver_id 
  OR (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'host'
  ))
) WITH CHECK (
  auth.uid() = receiver_id 
  OR (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'host'
  ))
);

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
