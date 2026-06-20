-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Adiciona contagem em tempo real (online agora) ao painel admin

CREATE TABLE IF NOT EXISTS public.site_active_sessions (
  session_id text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_active_sessions_last_seen_idx
  ON public.site_active_sessions (last_seen DESC);

ALTER TABLE public.site_active_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pulse_site_visit(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  INSERT INTO public.site_active_sessions (session_id, last_seen)
  VALUES (trim(p_session_id), now())
  ON CONFLICT (session_id) DO UPDATE
  SET last_seen = now();

  DELETE FROM public.site_active_sessions
  WHERE last_seen < now() - interval '10 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_site_visit_stats()
RETURNS TABLE (total_visits bigint, active_now bigint)
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
  SELECT
    COALESCE((s.value->>'total_visits')::bigint, 0),
    (
      SELECT count(*)::bigint
      FROM public.site_active_sessions a
      WHERE a.last_seen >= now() - interval '5 minutes'
    )
  FROM public.site_settings s
  WHERE s.key = 'visit_stats';
END;
$$;

REVOKE ALL ON FUNCTION public.pulse_site_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pulse_site_visit(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_site_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_visit_stats() TO authenticated;
