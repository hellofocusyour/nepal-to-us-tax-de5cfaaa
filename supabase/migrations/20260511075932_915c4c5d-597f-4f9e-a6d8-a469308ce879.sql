ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS cta_label TEXT,
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS opens_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.increment_email_open(_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_logs
  SET opens_count = opens_count + 1,
      last_opened_at = now(),
      first_opened_at = COALESCE(first_opened_at, now())
  WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_email_click(_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_logs
  SET clicks_count = clicks_count + 1,
      last_clicked_at = now()
  WHERE id = _id;
END;
$$;