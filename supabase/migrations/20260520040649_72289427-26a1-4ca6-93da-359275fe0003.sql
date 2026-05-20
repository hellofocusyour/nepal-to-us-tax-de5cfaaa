
-- Paid student check
CREATE OR REPLACE FUNCTION public.is_paid_student(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payments p
    JOIN public.students s ON s.id = p.student_id
    WHERE s.user_id = _user_id
      AND p.status = 'verified'
      AND p.installment_number = 1
  )
$$;

-- video_materials
CREATE TABLE public.video_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General',
  drive_file_id text NOT NULL,
  thumbnail_url text,
  duration_minutes integer,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paid students and admins view published videos"
ON public.video_materials FOR SELECT
TO authenticated
USING (
  (is_published = true AND public.is_paid_student(auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins manage video materials"
ON public.video_materials FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_video_materials_updated_at
BEFORE UPDATE ON public.video_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- video_access_logs
CREATE TABLE public.video_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.video_materials(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

CREATE INDEX idx_video_access_logs_user ON public.video_access_logs(user_id);
CREATE INDEX idx_video_access_logs_video ON public.video_access_logs(video_id);

ALTER TABLE public.video_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and admins view access logs"
ON public.video_access_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Paid students insert own access logs"
ON public.video_access_logs FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_paid_student(auth.uid())
);

-- video_terms_acknowledgments
CREATE TABLE public.video_terms_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL DEFAULT 'v1',
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, terms_version)
);

ALTER TABLE public.video_terms_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own acknowledgments, admins view all"
ON public.video_terms_acknowledgments FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own acknowledgments"
ON public.video_terms_acknowledgments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read video thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Admins upload video thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update video thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete video thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));
