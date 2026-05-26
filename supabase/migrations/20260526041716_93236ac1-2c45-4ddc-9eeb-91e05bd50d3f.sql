
-- 1. Restrict course_documents table SELECT to paid students + admins
DROP POLICY IF EXISTS "Authenticated can view course documents" ON public.course_documents;
CREATE POLICY "Paid students and admins view course documents"
ON public.course_documents
FOR SELECT
TO authenticated
USING (public.is_paid_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 2. Restrict course-documents storage bucket SELECT
DROP POLICY IF EXISTS "Authenticated can read course documents" ON storage.objects;
CREATE POLICY "Paid students and admins read course documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-documents'
  AND (public.is_paid_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
);

-- 3. Tighten conversations UPDATE — students can only update their own row and cannot change identity fields
DROP POLICY IF EXISTS "Students update own web conversation" ON public.conversations;
CREATE POLICY "Students update own web conversation"
ON public.conversations
FOR UPDATE
TO authenticated
USING (conversation_key = ('web:' || auth.uid()::text))
WITH CHECK (
  conversation_key = ('web:' || auth.uid()::text)
  AND platform = 'web'
);

-- 4. Remove activity_log from Realtime publication (admin-only table, no client subscribes to it)
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log;
