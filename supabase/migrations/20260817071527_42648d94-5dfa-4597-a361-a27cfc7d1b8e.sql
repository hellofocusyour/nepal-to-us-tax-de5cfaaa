ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP POLICY IF EXISTS "Students view own unlocked certificate" ON public.certificates;
CREATE POLICY "Students view own unlocked certificate"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  is_unlocked = true
  AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.batches b ON b.id = s.batch_id
    WHERE s.id = certificates.student_id
      AND s.user_id = auth.uid()
      AND b.is_completed = true
  )
);