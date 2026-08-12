CREATE TABLE public.exam_batches (
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, batch_id)
);

GRANT SELECT ON public.exam_batches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exam_batches TO authenticated;
GRANT ALL ON public.exam_batches TO service_role;

ALTER TABLE public.exam_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exam batches" ON public.exam_batches
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students view their exam batch links" ON public.exam_batches
FOR SELECT TO authenticated
USING (batch_id = public.student_batch_id(auth.uid()));

-- migrate existing single-batch targeting
INSERT INTO public.exam_batches (exam_id, batch_id)
SELECT id, batch_id FROM public.exams WHERE batch_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP POLICY "Students view published exams for their batch" ON public.exams;

CREATE POLICY "Students view published exams for their batch" ON public.exams
FOR SELECT TO authenticated
USING (
  is_published = true
  AND (
    NOT EXISTS (SELECT 1 FROM public.exam_batches eb WHERE eb.exam_id = exams.id)
    OR EXISTS (
      SELECT 1 FROM public.exam_batches eb
      WHERE eb.exam_id = exams.id
        AND eb.batch_id = public.student_batch_id(auth.uid())
    )
  )
);