ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS email_logs_inquiry_id_idx ON public.email_logs(inquiry_id);
CREATE INDEX IF NOT EXISTS email_logs_recipient_email_idx ON public.email_logs(recipient_email);