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

GRANT EXECUTE ON FUNCTION public.get_exam_review(uuid) TO authenticated;