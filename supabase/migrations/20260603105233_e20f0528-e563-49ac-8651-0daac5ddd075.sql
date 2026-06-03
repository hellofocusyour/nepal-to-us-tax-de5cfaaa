
CREATE TABLE public.batch_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

CREATE INDEX idx_batch_enrollments_batch ON public.batch_enrollments(batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_enrollments TO authenticated;
GRANT ALL ON public.batch_enrollments TO service_role;

ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage batch enrollments"
ON public.batch_enrollments
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view own enrollment"
ON public.batch_enrollments
FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- Sync function: update students.batch_id + recalc batches.enrolled_count
CREATE OR REPLACE FUNCTION public.sync_batch_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_batches UUID[] := ARRAY[]::UUID[];
  b UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.students SET batch_id = NEW.batch_id WHERE id = NEW.student_id;
    affected_batches := array_append(affected_batches, NEW.batch_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.students SET batch_id = NEW.batch_id WHERE id = NEW.student_id;
    affected_batches := array_append(affected_batches, NEW.batch_id);
    IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
      affected_batches := array_append(affected_batches, OLD.batch_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.students SET batch_id = NULL WHERE id = OLD.student_id AND batch_id = OLD.batch_id;
    affected_batches := array_append(affected_batches, OLD.batch_id);
  END IF;

  FOREACH b IN ARRAY affected_batches LOOP
    UPDATE public.batches
    SET enrolled_count = (SELECT COUNT(*) FROM public.batch_enrollments WHERE batch_id = b)
    WHERE id = b;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_batch_enrollments_sync
AFTER INSERT OR UPDATE OR DELETE ON public.batch_enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_batch_enrollment();

-- Backfill existing assignments
INSERT INTO public.batch_enrollments (batch_id, student_id, enrolled_at)
SELECT batch_id, id, created_at FROM public.students
WHERE batch_id IS NOT NULL
ON CONFLICT (student_id) DO NOTHING;
