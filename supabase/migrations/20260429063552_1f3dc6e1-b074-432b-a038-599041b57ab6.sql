CREATE TABLE public.course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tab TEXT NOT NULL CHECK (tab IN ('syllabus', 'my_courses')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID
);

ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage course documents"
ON public.course_documents FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view course documents"
ON public.course_documents FOR SELECT TO authenticated
USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('course-documents', 'course-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can read course documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-documents');

CREATE POLICY "Admins can upload course documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update course documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete course documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-documents' AND has_role(auth.uid(), 'admin'::app_role));