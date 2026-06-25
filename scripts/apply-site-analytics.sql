-- Analytics detalhado para o painel admin (origem, páginas, tempo, eventos)

CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  page_path text,
  referrer text,
  referrer_source text,
  campaign_slug text,
  duration_seconds integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_events_created_at_idx
  ON public.site_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS site_analytics_events_type_created_idx
  ON public.site_analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS site_analytics_events_page_created_idx
  ON public.site_analytics_events (page_path, created_at DESC)
  WHERE page_path IS NOT NULL;

ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read analytics events" ON public.site_analytics_events;
CREATE POLICY "Admins read analytics events" ON public.site_analytics_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_site_analytics_event(
  p_session_id text,
  p_event_type text,
  p_page_path text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_referrer_source text DEFAULT NULL,
  p_campaign_slug text DEFAULT NULL,
  p_duration_seconds integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  IF p_event_type IS NULL OR length(trim(p_event_type)) < 2 THEN
    RETURN;
  END IF;

  INSERT INTO public.site_analytics_events (
    session_id,
    event_type,
    page_path,
    referrer,
    referrer_source,
    campaign_slug,
    duration_seconds,
    metadata
  )
  VALUES (
    trim(p_session_id),
    trim(p_event_type),
    NULLIF(trim(COALESCE(p_page_path, '')), ''),
    NULLIF(left(trim(COALESCE(p_referrer, '')), 500), ''),
    NULLIF(trim(COALESCE(p_referrer_source, '')), ''),
    NULLIF(trim(COALESCE(p_campaign_slug, '')), ''),
    CASE
      WHEN p_duration_seconds IS NULL OR p_duration_seconds < 1 THEN NULL
      WHEN p_duration_seconds > 7200 THEN 7200
      ELSE p_duration_seconds
    END,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_analytics_dashboard(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days integer := GREATEST(1, LEAST(COALESCE(p_days, 30), 90));
  since timestamptz := now() - make_interval(days => days);
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'days', days,
    'visits_today', (
      SELECT count(DISTINCT session_id)
      FROM public.site_analytics_events
      WHERE event_type = 'page_view'
        AND created_at >= date_trunc('day', now())
    ),
    'visits_period', (
      SELECT count(DISTINCT session_id)
      FROM public.site_analytics_events
      WHERE event_type = 'page_view'
        AND created_at >= since
    ),
    'page_views_period', (
      SELECT count(*)
      FROM public.site_analytics_events
      WHERE event_type = 'page_view'
        AND created_at >= since
    ),
    'avg_time_on_page_seconds', (
      SELECT COALESCE(round(avg(duration_seconds))::int, 0)
      FROM public.site_analytics_events
      WHERE event_type = 'page_leave'
        AND duration_seconds IS NOT NULL
        AND created_at >= since
    ),
    'top_pages', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(page_path, '/') AS path,
          count(*)::int AS views
        FROM public.site_analytics_events
        WHERE event_type = 'page_view'
          AND created_at >= since
          AND page_path IS NOT NULL
        GROUP BY 1
        ORDER BY views DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'top_referrers', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(NULLIF(referrer_source, ''), 'Direto / desconhecido') AS source,
          count(*)::int AS visits
        FROM public.site_analytics_events
        WHERE event_type = 'page_view'
          AND created_at >= since
        GROUP BY 1
        ORDER BY visits DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'top_campaigns', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          e.campaign_slug AS slug,
          COALESCE(c.title, e.campaign_slug) AS title,
          count(*)::int AS views
        FROM public.site_analytics_events e
        LEFT JOIN public.campaigns c ON c.slug = e.campaign_slug
        WHERE e.event_type = 'campaign_view'
          AND e.campaign_slug IS NOT NULL
          AND e.created_at >= since
        GROUP BY e.campaign_slug, c.title
        ORDER BY views DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'top_events', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          event_type AS type,
          count(*)::int AS total
        FROM public.site_analytics_events
        WHERE event_type NOT IN ('page_view', 'page_leave')
          AND created_at >= since
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'visits_by_day', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.day)
      FROM (
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          count(DISTINCT session_id)::int AS visits
        FROM public.site_analytics_events
        WHERE event_type = 'page_view'
          AND created_at >= since
        GROUP BY 1
        ORDER BY 1
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_site_analytics_event(
  text, text, text, text, text, text, integer, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_site_analytics_event(
  text, text, text, text, text, text, integer, jsonb
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_admin_analytics_dashboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_dashboard(integer) TO authenticated;
