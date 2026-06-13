-- Run this in the SQL editor of your EXTERNAL Supabase project: skidrbtiqaouhnvyyiox
-- It adds restriction + reservation management columns and tables.

-- 1) Extend members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS restriction_reason text,
  ADD COLUMN IF NOT EXISTS restricted_at timestamptz;

-- Allow updating member status from the app (prototype: open policy)
DO $$ BEGIN
  CREATE POLICY "Members updatable" ON public.members FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'library',
  ADD COLUMN IF NOT EXISTS compartment text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

DO $$ BEGIN
  CREATE POLICY "Reservations updatable" ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Reservations deletable" ON public.reservations FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Restriction history
CREATE TABLE IF NOT EXISTS public.restriction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  uni_id text,
  member_name text,
  book_id text,
  book_title text,
  reason text NOT NULL DEFAULT 'Active Overdue Book',
  due_date timestamptz,
  return_date timestamptz,
  days_overdue integer,
  status text NOT NULL DEFAULT 'active',
  restricted_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  cleared_by_admin text
);
ALTER TABLE public.restriction_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Restriction history readable" ON public.restriction_history FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Restriction history insertable" ON public.restriction_history FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Restriction history updatable" ON public.restriction_history FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Reservation history
CREATE TABLE IF NOT EXISTS public.reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid,
  member_id uuid NOT NULL,
  book_id text NOT NULL,
  type text NOT NULL DEFAULT 'library',
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL,
  cancelled_at timestamptz,
  cancellation_reason text
);
ALTER TABLE public.reservation_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Reservation history readable" ON public.reservation_history FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Reservation history insertable" ON public.reservation_history FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
