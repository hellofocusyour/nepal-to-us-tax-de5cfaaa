
INSERT INTO public.batch_enrollments (batch_id, student_id, enrolled_at)
SELECT s.batch_id, s.id, now()
FROM public.students s
WHERE s.batch_id = 'c3a5eb31-dac5-4d0e-a7a4-9b0cc81259d1'
  AND NOT EXISTS (
    SELECT 1 FROM public.batch_enrollments be
    WHERE be.batch_id = s.batch_id AND be.student_id = s.id
  );

UPDATE public.batches b
SET enrolled_count = (SELECT count(*) FROM public.batch_enrollments be WHERE be.batch_id = b.id)
WHERE b.id = 'c3a5eb31-dac5-4d0e-a7a4-9b0cc81259d1';
