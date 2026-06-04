-- Restrict SELECT on class_sessions, live_class_settings, course_modules to paid students and admins

DROP POLICY IF EXISTS "Authenticated can read class_sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Authenticated users can view class sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "class_sessions_select" ON public.class_sessions;
CREATE POLICY "class_sessions_paid_select" ON public.class_sessions
  FOR SELECT TO authenticated
  USING (public.is_paid_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read live_class_settings" ON public.live_class_settings;
DROP POLICY IF EXISTS "Authenticated users can view live class settings" ON public.live_class_settings;
DROP POLICY IF EXISTS "live_class_settings_select" ON public.live_class_settings;
CREATE POLICY "live_class_settings_paid_select" ON public.live_class_settings
  FOR SELECT TO authenticated
  USING (public.is_paid_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can read course_modules" ON public.course_modules;
DROP POLICY IF EXISTS "Authenticated users can view course modules" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_select" ON public.course_modules;
CREATE POLICY "course_modules_paid_select" ON public.course_modules
  FOR SELECT TO authenticated
  USING (public.is_paid_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
