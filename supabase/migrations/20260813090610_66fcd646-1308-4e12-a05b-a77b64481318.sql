CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq;

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  certificate_number text NOT NULL UNIQUE,
  issued_on date,
  file_path text,
  is_unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.certificate_number_seq TO authenticated, service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage certificates" ON public.certificates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own unlocked certificate" ON public.certificates
  FOR SELECT TO authenticated
  USING (
    is_unlocked = true
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = certificates.student_id AND s.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.certificates_fill_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := 'FA-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.certificate_number_seq')::text, 5, '0');
  END IF;

  IF NEW.user_id IS NULL THEN
    SELECT s.user_id INTO NEW.user_id FROM public.students s WHERE s.id = NEW.student_id;
  END IF;

  IF NEW.batch_id IS NULL THEN
    SELECT s.batch_id INTO NEW.batch_id FROM public.students s WHERE s.id = NEW.student_id;
  END IF;

  IF NEW.issued_on IS NULL THEN
    SELECT b.end_date INTO NEW.issued_on FROM public.batches b WHERE b.id = NEW.batch_id;
    IF NEW.issued_on IS NULL THEN
      NEW.issued_on := current_date;
    END IF;
  END IF;

  IF NEW.is_unlocked = true AND NEW.unlocked_at IS NULL THEN
    NEW.unlocked_at := now();
  END IF;
  IF NEW.is_unlocked = false THEN
    NEW.unlocked_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_certificates_defaults
BEFORE INSERT OR UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.certificates_fill_defaults();

CREATE TRIGGER trg_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can upload certificates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update certificates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete certificates" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can read own certificate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.certificates c
      JOIN public.students s ON s.id = c.student_id
      WHERE s.user_id = auth.uid()
        AND c.is_unlocked = true
        AND c.file_path = storage.objects.name
    )
  );