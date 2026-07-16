-- Visualizações suaves (soft_views): NÃO alteram a coluna views (reais).
-- A cada ~2h cada campanha pública ganha +3 soft, bem espaçado entre campanhas.
-- Cole no Supabase → SQL Editor → Run

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS soft_views INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.campaign_soft_view_state (
  campaign_id UUID PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bumps_in_window INTEGER NOT NULL DEFAULT 0,
  last_bump_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_soft_view_state_last_bump
  ON public.campaign_soft_view_state (last_bump_at NULLS FIRST);

GRANT ALL ON public.campaign_soft_view_state TO service_role;
REVOKE ALL ON public.campaign_soft_view_state FROM PUBLIC, anon, authenticated;

-- Dono não pode alterar soft_views (nem views)
CREATE OR REPLACE FUNCTION public.guard_campaign_owner_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
    RETURN NEW;
  END IF;

  NEW.featured := OLD.featured;
  NEW.hidden := OLD.hidden;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.views := OLD.views;
  NEW.soft_views := OLD.soft_views;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'approved' AND NEW.status = 'pending' THEN
      NULL;
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_soft_campaign_views()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_campaigns INTEGER;
  bumps_this_tick INTEGER;
  bumped INTEGER := 0;
  skipped_random BOOLEAN := false;
  rec RECORD;
  window_start TIMESTAMPTZ;
  bumps INTEGER;
BEGIN
  -- Irregularidade leve (~12% dos ticks não fazem nada)
  IF random() < 0.12 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'bumped', 0);
  END IF;

  SELECT count(*)::int INTO n_campaigns
  FROM public.campaigns
  WHERE status = 'approved'
    AND COALESCE(hidden, false) = false;

  IF n_campaigns = 0 THEN
    RETURN jsonb_build_object('ok', true, 'bumped', 0, 'campaigns', 0);
  END IF;

  -- Meta: 3 por campanha / 2h. Cron ~ a cada 4 min ⇒ ~30 ticks/2h
  bumps_this_tick := GREATEST(1, CEIL(n_campaigns * 3.0 / 30.0)::int);
  -- No máximo 2 por tick para não parecer rajada
  bumps_this_tick := LEAST(bumps_this_tick, 2);

  FOR rec IN
    SELECT c.id
    FROM public.campaigns c
    LEFT JOIN public.campaign_soft_view_state s ON s.campaign_id = c.id
    WHERE c.status = 'approved'
      AND COALESCE(c.hidden, false) = false
      AND (
        s.last_bump_at IS NULL
        OR s.last_bump_at < now() - interval '6 minutes'
      )
      AND (
        s.campaign_id IS NULL
        OR s.window_started_at < now() - interval '2 hours'
        OR s.bumps_in_window < 3
      )
    ORDER BY s.last_bump_at NULLS FIRST, random()
    LIMIT bumps_this_tick
  LOOP
    SELECT s.window_started_at, s.bumps_in_window
      INTO window_start, bumps
    FROM public.campaign_soft_view_state s
    WHERE s.campaign_id = rec.id;

    IF NOT FOUND THEN
      window_start := now();
      bumps := 0;
    ELSIF window_start < now() - interval '2 hours' THEN
      window_start := now();
      bumps := 0;
    END IF;

    IF bumps >= 3 THEN
      CONTINUE;
    END IF;

    -- Só soft_views — coluna views (real) intacta; sem mexer em updated_at
    UPDATE public.campaigns
    SET soft_views = soft_views + 1
    WHERE id = rec.id;

    INSERT INTO public.campaign_soft_view_state (
      campaign_id, window_started_at, bumps_in_window, last_bump_at
    )
    VALUES (rec.id, window_start, bumps + 1, now())
    ON CONFLICT (campaign_id) DO UPDATE
    SET
      window_started_at = EXCLUDED.window_started_at,
      bumps_in_window = EXCLUDED.bumps_in_window,
      last_bump_at = EXCLUDED.last_bump_at;

    bumped := bumped + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'bumped', bumped,
    'campaigns', n_campaigns,
    'quota', bumps_this_tick,
    'skipped', skipped_random
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tick_soft_campaign_views() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tick_soft_campaign_views() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tick_soft_campaign_views() TO service_role;

-- Opcional: se pg_cron estiver ativo no projeto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('soft-campaign-views');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'soft-campaign-views',
      '*/4 * * * *',
      $cron$SELECT public.tick_soft_campaign_views();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
