ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
CREATE INDEX IF NOT EXISTS idx_inquiries_source ON public.inquiries(source);
CREATE INDEX IF NOT EXISTS idx_inquiries_email_lower ON public.inquiries(lower(email));