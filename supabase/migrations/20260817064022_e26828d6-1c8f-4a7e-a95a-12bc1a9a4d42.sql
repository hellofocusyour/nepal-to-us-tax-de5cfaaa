ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS file_path text;

CREATE TABLE public.module_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  description text,
  slide_count integer NOT NULL DEFAULT 0,
  file_path text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (module_id, version_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_versions TO authenticated;
GRANT ALL ON public.module_versions TO service_role;

ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage module versions"
ON public.module_versions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));