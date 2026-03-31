
-- The "Anyone can submit inquiry" policy is intentionally permissive for public form submissions.
-- No changes needed for that specific warning as it's a public-facing feature.
-- However, let's tighten the admin storage policy to be more specific
DROP POLICY IF EXISTS "Admins can manage all files" ON storage.objects;

CREATE POLICY "Admins can view all files" ON storage.objects
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete files" ON storage.objects
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
