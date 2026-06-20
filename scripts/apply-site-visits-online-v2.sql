-- Cole no Supabase → SQL Editor → Run (versão estável do "Online agora")
-- Usa site_settings (mesma tabela do total de visitas) — mais confiável

INSERT INTO public.site_settings (key, value)
VALUES ('active_sessions', '{"sessions": {}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.pulse_site_visit(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw jsonb;
  cleaned jsonb := '{}'::jsonb;
  sid text;
  seen_text text;
  cutoff timestamptz := now() - interval '15 minutes';
  session_key text;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  session_key := trim(p_session_id);

  SELECT COALESCE(value->'sessions', '{}'::jsonb) INTO raw
  FROM public.site_settings
  WHERE key = 'active_sessions';

  IF raw IS NULL THEN
    raw := '{}'::jsonb;
  END IF;

  raw := raw || jsonb_build_object(session_key, to_jsonb(now()::text));

  FOR sid, seen_text IN SELECT * FROM jsonb_each_text(raw)
  LOOP
    IF sid IS NULL OR seen_text IS NULL THEN
      CONTINUE;
    END IF;
    IF seen_text::timestamptz >= cutoff THEN
      cleaned := cleaned || jsonb_build_object(sid, to_jsonb(seen_text));
    END IF;
  END LOOP;

  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('active_sessions', jsonb_build_object('sessions', cleaned), now())
  ON CONFLICT (key) DO UPDATE
  SET value = jsonb_build_object('sessions', cleaned), updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.get_site_visit_stats();

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
    COALESCE(
      (
        SELECT (value->>'total_visits')::bigint
        FROM public.site_settings
        WHERE key = 'visit_stats'
      ),
      0::bigint
    ) AS total_visits,
    (
      SELECT count(*)::bigint
      FROM public.site_settings s,
           LATERAL jsonb_each_text(COALESCE(s.value->'sessions', '{}'::jsonb)) AS e(session_id, seen_at)
      WHERE s.key = 'active_sessions'
        AND e.seen_at::timestamptz >= now() - interval '10 minutes'
    ) AS active_now;
END;
$$;

REVOKE ALL ON FUNCTION public.pulse_site_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pulse_site_visit(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_site_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_visit_stats() TO authenticated;
