
-- 1. Harden is_super_admin: base on auth.users (which users can't self-edit) instead of profiles
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'hello@focusyourfinance.com'
  )
$$;

-- 2. Admin SELECT policy for certificates bucket (defence in depth)
CREATE POLICY "Admins can view all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'certificates' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Paid student SELECT policies for module-slides and module-pdfs
CREATE POLICY "Paid students read module slides"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'module-slides' AND is_paid_student(auth.uid()));

CREATE POLICY "Paid students read module pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'module-pdfs' AND is_paid_student(auth.uid()));
