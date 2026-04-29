-- Dedupe inquiries: keep the most recent row per email
DELETE FROM public.inquiries a
USING public.inquiries b
WHERE a.email = b.email
  AND a.created_at < b.created_at;

-- For ties on created_at, keep one by id
DELETE FROM public.inquiries a
USING public.inquiries b
WHERE a.email = b.email
  AND a.created_at = b.created_at
  AND a.id < b.id;

-- Dedupe students: keep most recent
DELETE FROM public.students a
USING public.students b
WHERE a.email = b.email
  AND a.created_at < b.created_at;

DELETE FROM public.students a
USING public.students b
WHERE a.email = b.email
  AND a.created_at = b.created_at
  AND a.id < b.id;

-- Normalize emails to lowercase for consistent uniqueness
UPDATE public.inquiries SET email = lower(trim(email));
UPDATE public.students SET email = lower(trim(email));

-- Add UNIQUE constraints
ALTER TABLE public.inquiries ADD CONSTRAINT inquiries_email_unique UNIQUE (email);
ALTER TABLE public.students ADD CONSTRAINT students_email_unique UNIQUE (email);