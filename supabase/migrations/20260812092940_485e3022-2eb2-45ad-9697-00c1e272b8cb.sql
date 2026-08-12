-- 1. Retake flags
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS allow_retakes boolean NOT NULL DEFAULT false;

ALTER TABLE public.exam_batches
  ADD COLUMN IF NOT EXISTS allow_retakes boolean NOT NULL DEFAULT false;

-- 2. Helper: can the current user retake this exam?
CREATE OR REPLACE FUNCTION public.can_retake_exam(_exam_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT e.allow_retakes FROM public.exams e WHERE e.id = _exam_id),
    false
  )
  OR EXISTS (
    SELECT 1
    FROM public.exam_batches eb
    WHERE eb.exam_id = _exam_id
      AND eb.allow_retakes = true
      AND eb.batch_id = public.student_batch_id(auth.uid())
  );
$$;

-- 3. Allow a fresh submission when retakes are unlocked
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_exam_id uuid, _answers jsonb)
RETURNS TABLE(score integer, total_marks integer, passed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF NOT FOUND OR _exam.is_published = false THEN
    RAISE EXCEPTION 'Exam not available';
  END IF;
  IF _exam.batch_id IS NOT NULL AND _exam.batch_id IS DISTINCT FROM public.student_batch_id(_uid) THEN
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
    SET answers = _answers,
        score = _score,
        total_marks = _total,
        passed = _passed,
        submitted_at = now()
    WHERE id = _existing;
  ELSE
    INSERT INTO public.exam_attempts (exam_id, user_id, answers, score, total_marks, passed)
    VALUES (_exam_id, _uid, _answers, _score, _total, _passed);
  END IF;

  RETURN QUERY SELECT _score, _total, _passed;
END;
$$;