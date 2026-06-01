
-- Admin sections enum
CREATE TYPE public.admin_section AS ENUM (
  'dashboard','inbox','students','inquiries','payments','batches',
  'live_class','modules','video_materials','my_courses','announcements',
  'reports','integrations','team'
);

-- Permissions table
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section public.admin_section NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Super admin check (hardcoded email)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND lower(email) = 'hello@focusyourfinance.com'
  )
$$;

-- Has access to a given admin section
CREATE OR REPLACE FUNCTION public.has_admin_section(_user_id uuid, _section public.admin_section)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.admin_permissions
      WHERE user_id = _user_id AND section = _section
    )
$$;

-- RLS: super admin manages everything; admins can read their own grants
CREATE POLICY "Super admin manages permissions"
ON public.admin_permissions
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users read own permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Backfill outbound messages with main admin attribution where missing
UPDATE public.messages
SET sender_id = 'e3aede33-aa8e-47a2-aafa-499af06db0b8',
    sender_name = 'hello@focusyourfinance.com'
WHERE direction = 'outbound'
  AND (sender_name IS NULL OR sender_name = '');
