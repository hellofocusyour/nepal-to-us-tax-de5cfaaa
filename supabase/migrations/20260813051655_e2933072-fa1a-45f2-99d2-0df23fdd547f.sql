CREATE OR REPLACE FUNCTION public.can_access_exam(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = _exam_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR (
          e.is_published = true
          AND (e.available_from IS NULL OR e.available_from <= now())
          AND (e.available_until IS NULL OR e.available_until >= now())
          AND (
            CASE
              WHEN EXISTS (SELECT 1 FROM public.exam_batches eb WHERE eb.exam_id = e.id)
                THEN EXISTS (
                  SELECT 1 FROM public.exam_batches eb
                  WHERE eb.exam_id = e.id
                    AND eb.batch_id = public.student_batch_id(auth.uid())
                )
              WHEN e.batch_id IS NOT NULL
                THEN e.batch_id = public.student_batch_id(auth.uid())
              ELSE true
            END
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id uuid)
RETURNS TABLE(id uuid, question_text text, options jsonb, marks integer, display_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.id, q.question_text, q.options, q.marks, q.display_order
  FROM public.exam_questions q
  WHERE q.exam_id = _exam_id
    AND public.can_access_exam(_exam_id)
  ORDER BY q.display_order, q.created_at
$$;

CREATE OR REPLACE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE(id uuid, question_text text, options jsonb, marks integer, display_order integer, correct_index integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.id, q.question_text, q.options, q.marks, q.display_order, q.correct_index
  FROM public.exam_questions q
  WHERE q.exam_id = _exam_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.exam_attempts a
        WHERE a.exam_id = _exam_id AND a.user_id = auth.uid()
      )
    )
  ORDER BY q.display_order, q.created_at
$$;

CREATE OR REPLACE FUNCTION public.can_retake_exam(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.can_access_exam(_exam_id)
  AND (
    COALESCE((SELECT e.allow_retakes FROM public.exams e WHERE e.id = _exam_id), false)
    OR EXISTS (
      SELECT 1
      FROM public.exam_batches eb
      WHERE eb.exam_id = _exam_id
        AND eb.allow_retakes = true
        AND eb.batch_id = public.student_batch_id(auth.uid())
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_exam_id uuid, _answers jsonb)
RETURNS TABLE(score integer, total_marks integer, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _exam public.exams%ROWTYPE;
  _score integer := 0;
  _total integer := 0;
  _passed boolean := false;
  _existing uuid;
  q record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _exam FROM public.exams WHERE id = _exam_id;
  IF NOT FOUND OR NOT public.can_access_exam(_exam_id) THEN
    RAISE EXCEPTION 'Exam not available';
  END IF;

  SELECT id INTO _existing
  FROM public.exam_attempts
  WHERE exam_id = _exam_id AND user_id = _uid;

  IF _existing IS NOT NULL AND NOT public.can_retake_exam(_exam_id) THEN
    RAISE EXCEPTION 'You have already submitted this exam';
  END IF;

  FOR q IN SELECT * FROM public.exam_questions WHERE exam_id = _exam_id LOOP
    _total := _total + q.marks;
    IF (_answers ->> q.id::text) IS NOT NULL
       AND (_answers ->> q.id::text)::int = q.correct_index THEN
      _score := _score + q.marks;
    END IF;
  END LOOP;

  _passed := _total > 0 AND (_score::numeric / _total::numeric) * 100 >= _exam.pass_percentage;

  IF _existing IS NOT NULL THEN
    UPDATE public.exam_attempts
    SET answers = _answers, score = _score, total_marks = _total,
        passed = _passed, submitted_at = now()
    WHERE id = _existing;
  ELSE
    INSERT INTO public.exam_attempts (exam_id, user_id, answers, score, total_marks, passed)
    VALUES (_exam_id, _uid, _answers, _score, _total, _passed);
  END IF;

  RETURN QUERY SELECT _score, _total, _passed;
END;
$$;

DROP POLICY IF EXISTS "Students view published exams for their batch" ON public.exams;
CREATE POLICY "Students view exams unlocked for their batch"
ON public.exams FOR SELECT TO authenticated
USING (public.can_access_exam(id));