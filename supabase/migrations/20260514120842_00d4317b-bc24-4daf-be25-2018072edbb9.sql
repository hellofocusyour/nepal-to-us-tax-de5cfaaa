
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number int NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  slide_count int NOT NULL DEFAULT 0,
  is_unlocked boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage course modules"
  ON public.course_modules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated view course modules"
  ON public.course_modules FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.course_modules (module_number, title, description, slide_count, is_unlocked) VALUES
  (1,'Foundations of US Taxation','Tax system overview, key concepts, terminology and the role of the IRS.',12,true),
  (2,'Filing Fundamentals','Filing status, dependents, forms 1040 and required schedules.',12,false),
  (3,'Gross Income Deep Dive','Wages, interest, dividends, business income, and other income items.',12,false),
  (4,'Adjustments, Deductions & QBI','Above-the-line adjustments, itemized vs standard, QBI deduction.',12,false),
  (5,'Tax Calculation & Credits','Tax tables, brackets, AMT, refundable and non-refundable credits.',12,false),
  (6,'Capital Gains & Depreciation','Schedule D, basis, holding periods, MACRS, Section 179.',12,false),
  (7,'Practical Tax Preparation','End-to-end return prep, software workflow, e-filing, common errors.',12,false),
  (8,'Business Tax Returns','Schedule C, partnerships, S-corps, payroll basics.',12,false),
  (9,'Advanced & Real World','Special situations, IRS notices, planning strategies, ethics.',12,false);

INSERT INTO storage.buckets (id, name, public) VALUES ('module-slides','module-slides', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage module slides"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='module-slides' AND has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='module-slides' AND has_role(auth.uid(),'admin'));
