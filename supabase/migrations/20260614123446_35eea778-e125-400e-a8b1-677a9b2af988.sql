
ALTER TABLE public.live_class_settings
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE;

-- Ensure at most one row per batch, and at most one global (null batch) row
CREATE UNIQUE INDEX IF NOT EXISTS live_class_settings_batch_unique
  ON public.live_class_settings ((COALESCE(batch_id::text, '__global__')));

-- Replace the broad authenticated-select policy with a batch-scoped one
DROP POLICY IF EXISTS "Authenticated can view live class settings" ON public.live_class_settings;
DROP POLICY IF EXISTS "live_class_settings_paid_select" ON public.live_class_settings;

CREATE POLICY "Students see their batch live class settings"
  ON public.live_class_settings FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR batch_id IS NULL
    OR batch_id = public.student_batch_id(auth.uid())
  );
