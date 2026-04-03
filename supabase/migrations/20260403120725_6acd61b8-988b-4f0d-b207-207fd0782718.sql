
ALTER TABLE public.borrowed_books ADD COLUMN returned_at timestamptz DEFAULT NULL;

CREATE POLICY "Borrowed books updatable"
ON public.borrowed_books
FOR UPDATE
USING (true);
