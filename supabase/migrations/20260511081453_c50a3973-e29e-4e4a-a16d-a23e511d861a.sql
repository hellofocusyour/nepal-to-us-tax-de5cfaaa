CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  provider_response jsonb,
  inquiry_id uuid,
  student_id uuid,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms logs" ON public.sms_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs(created_at DESC);