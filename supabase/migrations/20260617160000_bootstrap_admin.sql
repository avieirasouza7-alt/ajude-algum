-- Permite que o primeiro usuário logado vire admin (útil em desenvolvimento).
-- Só funciona enquanto não existir nenhum admin na plataforma.

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
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT count(*)::int INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF admin_count > 0 THEN
    RAISE EXCEPTION 'admin_already_exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
