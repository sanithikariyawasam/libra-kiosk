
CREATE TABLE public.kiosk (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compartment text NOT NULL UNIQUE,
  book_id text,
  book_name text,
  returned_at timestamptz
);

ALTER TABLE public.kiosk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kiosk readable by all" ON public.kiosk FOR SELECT USING (true);
CREATE POLICY "Kiosk updatable by all" ON public.kiosk FOR UPDATE USING (true);

-- Seed the 6 compartments
INSERT INTO public.kiosk (compartment) VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F');
