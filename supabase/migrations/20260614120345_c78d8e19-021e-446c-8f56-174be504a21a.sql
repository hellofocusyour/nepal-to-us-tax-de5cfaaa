
-- 1. Extend batches + students
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS access_granted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_organization text;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS sponsor_organization text;

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.student_batch_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT batch_id FROM public.students WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_full_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_paid_student(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.students s
      LEFT JOIN public.batches b ON b.id = s.batch_id
      WHERE s.user_id = _user_id
        AND (COALESCE(b.access_granted, false) = true
             OR (s.sponsor_organization IS NOT NULL AND s.sponsor_organization <> ''))
    );
$$;

-- 3. Join tables
CREATE TABLE IF NOT EXISTS public.module_batches (
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (module_id, batch_id)
);
GRANT SELECT ON public.module_batches TO authenticated;
GRANT ALL ON public.module_batches TO service_role;
ALTER TABLE public.module_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated view module_batches" ON public.module_batches;
CREATE POLICY "Authenticated view module_batches" ON public.module_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage module_batches" ON public.module_batches;
CREATE POLICY "Admins manage module_batches" ON public.module_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.video_batches (
  video_material_id uuid NOT NULL REFERENCES public.video_materials(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_material_id, batch_id)
);
GRANT SELECT ON public.video_batches TO authenticated;
GRANT ALL ON public.video_batches TO service_role;
ALTER TABLE public.video_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated view video_batches" ON public.video_batches;
CREATE POLICY "Authenticated view video_batches" ON public.video_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage video_batches" ON public.video_batches;
CREATE POLICY "Admins manage video_batches" ON public.video_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.document_batches (
  document_id uuid NOT NULL REFERENCES public.course_documents(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, batch_id)
);
GRANT SELECT ON public.document_batches TO authenticated;
GRANT ALL ON public.document_batches TO service_role;
ALTER TABLE public.document_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated view document_batches" ON public.document_batches;
CREATE POLICY "Authenticated view document_batches" ON public.document_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage document_batches" ON public.document_batches;
CREATE POLICY "Admins manage document_batches" ON public.document_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.announcement_batches (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, batch_id)
);
GRANT SELECT ON public.announcement_batches TO authenticated;
GRANT ALL ON public.announcement_batches TO service_role;
ALTER TABLE public.announcement_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated view announcement_batches" ON public.announcement_batches;
CREATE POLICY "Authenticated view announcement_batches" ON public.announcement_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage announcement_batches" ON public.announcement_batches;
CREATE POLICY "Admins manage announcement_batches" ON public.announcement_batches FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 4. Configure Batch 3 ACCA
UPDATE public.batches
SET access_granted = true,
    is_partner = true,
    sponsor_organization = 'ACCA Organization',
    start_date = '2026-06-15',
    end_date = GREATEST(end_date, DATE '2026-08-15')
WHERE name ILIKE '%ACCA%' OR name ILIKE '%batch 3%';

-- 5. Backfill: assign all existing content to every batch EXCEPT the ACCA / Batch 3 batch
INSERT INTO public.module_batches (module_id, batch_id)
SELECT m.id, b.id
FROM public.course_modules m
CROSS JOIN public.batches b
WHERE b.name NOT ILIKE '%ACCA%' AND b.name NOT ILIKE '%batch 3%'
ON CONFLICT DO NOTHING;

INSERT INTO public.video_batches (video_material_id, batch_id)
SELECT v.id, b.id
FROM public.video_materials v
CROSS JOIN public.batches b
WHERE b.name NOT ILIKE '%ACCA%' AND b.name NOT ILIKE '%batch 3%'
ON CONFLICT DO NOTHING;

INSERT INTO public.document_batches (document_id, batch_id)
SELECT d.id, b.id
FROM public.course_documents d
CROSS JOIN public.batches b
WHERE b.name NOT ILIKE '%ACCA%' AND b.name NOT ILIKE '%batch 3%'
ON CONFLICT DO NOTHING;

INSERT INTO public.announcement_batches (announcement_id, batch_id)
SELECT a.id, b.id
FROM public.announcements a
CROSS JOIN public.batches b
WHERE b.name NOT ILIKE '%ACCA%' AND b.name NOT ILIKE '%batch 3%'
ON CONFLICT DO NOTHING;

-- 6. Replace RLS on content tables with batch-scoped policies
DROP POLICY IF EXISTS "Authenticated view course modules" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_paid_select" ON public.course_modules;
DROP POLICY IF EXISTS "Students view modules in their batch" ON public.course_modules;
CREATE POLICY "Students view modules in their batch" ON public.course_modules FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.module_batches mb
    WHERE mb.module_id = course_modules.id
      AND mb.batch_id = public.student_batch_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Paid students and admins view published videos" ON public.video_materials;
DROP POLICY IF EXISTS "Students view videos in their batch" ON public.video_materials;
CREATE POLICY "Students view videos in their batch" ON public.video_materials FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.video_batches vb
      WHERE vb.video_material_id = video_materials.id
        AND vb.batch_id = public.student_batch_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Paid students and admins view course documents" ON public.course_documents;
DROP POLICY IF EXISTS "Students view documents in their batch" ON public.course_documents;
CREATE POLICY "Students view documents in their batch" ON public.course_documents FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.document_batches db
    WHERE db.document_id = course_documents.id
      AND db.batch_id = public.student_batch_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Students can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Students view announcements in their batch" ON public.announcements;
CREATE POLICY "Students view announcements in their batch" ON public.announcements FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.announcement_batches ab
    WHERE ab.announcement_id = announcements.id
      AND ab.batch_id = public.student_batch_id(auth.uid())
  )
);

-- 7. Bulk email runs log
CREATE TABLE IF NOT EXISTS public.batch_email_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  batch_name text,
  template_key text,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.batch_email_runs TO authenticated;
GRANT ALL ON public.batch_email_runs TO service_role;
ALTER TABLE public.batch_email_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage batch_email_runs" ON public.batch_email_runs;
CREATE POLICY "Admins manage batch_email_runs" ON public.batch_email_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
