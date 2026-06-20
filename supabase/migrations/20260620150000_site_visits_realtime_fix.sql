-- Fix "Online agora" stuck at zero

ALTER TABLE public.site_active_sessions DISABLE ROW LEVEL SECURITY;

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
      FROM public.site_active_sessions
      WHERE last_seen >= now() - interval '5 minutes'
    ) AS active_now;
END;
$$;

REVOKE ALL ON FUNCTION public.get_site_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_visit_stats() TO authenticated;
