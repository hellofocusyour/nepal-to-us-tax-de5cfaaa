
INSERT INTO storage.buckets (id, name, public) VALUES ('module-pdfs','module-pdfs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage module pdfs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='module-pdfs' AND has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='module-pdfs' AND has_role(auth.uid(),'admin'));
