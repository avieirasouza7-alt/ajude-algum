-- Cole no Supabase → SQL Editor → Run (só uma vez)

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_count int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT count(*)::int INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN RAISE EXCEPTION 'admin_already_exists'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

-- OU troque o e-mail abaixo e rode só este INSERT:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin'::public.app_role FROM auth.users
-- WHERE email = 'SEU_EMAIL@exemplo.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
