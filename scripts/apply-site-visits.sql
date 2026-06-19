-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Contagem de visitantes para exibir no painel admin

INSERT INTO public.site_settings (key, value)
VALUES ('visit_stats', '{"total_visits": 0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_site_visit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.site_settings (key, value)
  VALUES ('visit_stats', '{"total_visits": 1}'::jsonb)
  ON CONFLICT (key) DO UPDATE
  SET
    value = jsonb_set(
      public.site_settings.value,
      '{total_visits}',
      to_jsonb(COALESCE((public.site_settings.value->>'total_visits')::int, 0) + 1)
    ),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_site_visit_stats()
RETURNS TABLE (total_visits bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT COALESCE((value->>'total_visits')::bigint, 0)
  FROM public.site_settings
  WHERE key = 'visit_stats';
END;
$$;

REVOKE ALL ON FUNCTION public.increment_site_visit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_site_visit() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_site_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_visit_stats() TO authenticated;
