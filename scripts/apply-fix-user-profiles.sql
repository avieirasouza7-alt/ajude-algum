-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Corrige: painel mostra 0 usuários mesmo com campanhas existentes.
-- Causa: campanhas usam auth.users; o painel lia só public.profiles (às vezes incompleto).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ensure_missing_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH missing AS (
    INSERT INTO public.profiles (id, full_name, avatar_url, account_status)
    SELECT
      u.id,
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1),
        'Usuário'
      ),
      u.raw_user_meta_data->>'avatar_url',
      'active'
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO inserted FROM missing;

  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'user'::public.app_role
  FROM auth.users u
  LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
  WHERE r.id IS NULL
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ensure_missing_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ensure_missing_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    -- Conta contas reais; campanhas referenciam auth.users, não profiles
    'total_users', (SELECT count(*)::int FROM auth.users),
    'active_users', (
      SELECT count(*)::int
      FROM public.profiles
      WHERE account_status = 'active'
    ),
    'new_users_7d', (
      SELECT count(*)::int
      FROM auth.users
      WHERE created_at >= now() - interval '7 days'
    ),
    'total_campaigns', (SELECT count(*)::int FROM public.campaigns),
    'approved_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'approved'),
    'pending_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'pending'),
    'rejected_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'rejected'),
    'correction_campaigns', (
      SELECT count(*)::int FROM public.campaigns WHERE status = 'correction_requested'
    ),
    'archived_campaigns', (SELECT count(*)::int FROM public.campaigns WHERE status = 'archived'),
    'total_reports', (SELECT count(*)::int FROM public.reports),
    'open_reports', (SELECT count(*)::int FROM public.reports WHERE resolved = false),
    'total_comments', (SELECT count(*)::int FROM public.comments)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- Preenche agora os perfis que faltam
INSERT INTO public.profiles (id, full_name, avatar_url, account_status)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Usuário'
  ),
  u.raw_user_meta_data->>'avatar_url',
  'active'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'user'
WHERE r.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
