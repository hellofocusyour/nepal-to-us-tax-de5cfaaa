REVOKE EXECUTE ON FUNCTION public.can_retake_exam(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_retake_exam(uuid) TO authenticated, service_role;