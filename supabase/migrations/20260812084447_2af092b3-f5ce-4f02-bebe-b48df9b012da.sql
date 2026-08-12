-- 1. new admin section
ALTER TYPE public.admin_section ADD VALUE IF NOT EXISTS 'exams';

-- 2. exams
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  pass_percentage integer NOT NULL DEFAULT 50,
  is_published boolean NOT NULL DEFAULT false,
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exams" ON public.exams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view published exams for their batch" ON public.exams
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (batch_id IS NULL OR batch_id = public.student_batch_id(auth.uid()))
  );

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. questions (admin-only; students read via RPC without correct answers)
CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  marks integer NOT NULL DEFAULT 1,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exam questions" ON public.exam_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_exam_questions_updated_at BEFORE UPDATE ON public.exam_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. attempts
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total_marks integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all attempts" ON public.exam_attempts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_attempts_exam ON public.exam_attempts(exam_id);

-- 5. secure question fetch (no correct answers)
CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id uuid)
RETURNS TABLE (id uuid, question_text text, options jsonb, marks integer, display_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.question_text, q.options, q.marks, q.display_order
  FROM public.exam_questions q
  JOIN public.exams e ON e.id = q.exam_id
  WHERE q.exam_id = _exam_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        e.is_published = true
        AND (e.batch_id IS NULL OR e.batch_id = public.student_batch_id(auth.uid()))
        AND (e.available_from IS NULL OR e.available_from <= now())
        AND (e.available_until IS NULL OR e.available_until >= now())
      )
    )
  ORDER BY q.display_order, q.created_at
$$;

-- 6. secure grading
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(_exam_id uuid, _answers jsonb)
RETURNS TABLE (score integer, total_marks integer, passed boolean)
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
  IF EXISTS (SELECT 1 FROM public.exam_attempts WHERE exam_id = _exam_id AND user_id = _uid) THEN
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

  INSERT INTO public.exam_attempts (exam_id, user_id, answers, score, total_marks, passed)
  VALUES (_exam_id, _uid, _answers, _score, _total, _passed);

  RETURN QUERY SELECT _score, _total, _passed;
END;
$$;