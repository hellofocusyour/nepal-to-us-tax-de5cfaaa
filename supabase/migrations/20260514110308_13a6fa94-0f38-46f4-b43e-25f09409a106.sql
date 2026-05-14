
CREATE TABLE IF NOT EXISTS public.live_class_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_link text NOT NULL DEFAULT '',
  class_title text NOT NULL DEFAULT 'Live Class',
  class_description text,
  next_class_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 90,
  reminder_minutes integer NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  last_reminder_sent_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.live_class_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view live class settings"
  ON public.live_class_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage live class settings"
  ON public.live_class_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_live_class_settings_updated_at
  BEFORE UPDATE ON public.live_class_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with tomorrow 8:30 AM Nepal time (UTC+05:45) => 02:45 UTC
INSERT INTO public.live_class_settings (meet_link, class_title, class_description, next_class_at, duration_minutes, reminder_minutes, enabled)
VALUES (
  'https://meet.google.com/ezx-rxzc-zwv',
  'Live Class — US Tax Mastery',
  'Join your live class on Google Meet. Be on time and keep your camera on.',
  ((CURRENT_DATE + INTERVAL '1 day') + TIME '08:30')::timestamp AT TIME ZONE 'Asia/Kathmandu',
  90,
  30,
  true
);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
