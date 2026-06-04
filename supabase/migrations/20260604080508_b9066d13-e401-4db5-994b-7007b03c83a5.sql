ALTER TABLE public.live_class_settings
  ADD COLUMN IF NOT EXISTS recurrence_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_days int[] NOT NULL DEFAULT ARRAY[1,2,3,4],
  ADD COLUMN IF NOT EXISTS recurrence_time text NOT NULL DEFAULT '19:00';