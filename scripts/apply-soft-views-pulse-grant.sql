-- Libera o tick para o site chamar (continua limitado no banco: 3/2h, espaçado).
-- Rode no SQL Editor. Também aplica um empurrão inicial discreto (+3 soft) se estiver zerado.

GRANT EXECUTE ON FUNCTION public.tick_soft_campaign_views() TO anon, authenticated;

-- Se soft_views ainda está 0, dá o primeiro ciclo (+3) sem tocar views reais
UPDATE public.campaigns
SET soft_views = soft_views + 3
WHERE status = 'approved'
  AND COALESCE(hidden, false) = false
  AND soft_views = 0;

-- Marca estado para não repetir rajada imediata no mesmo ciclo
INSERT INTO public.campaign_soft_view_state (
  campaign_id, window_started_at, bumps_in_window, last_bump_at
)
SELECT c.id, now(), 3, now()
FROM public.campaigns c
WHERE c.status = 'approved'
  AND COALESCE(c.hidden, false) = false
ON CONFLICT (campaign_id) DO UPDATE
SET
  window_started_at = EXCLUDED.window_started_at,
  bumps_in_window = 3,
  last_bump_at = EXCLUDED.last_bump_at
WHERE public.campaign_soft_view_state.bumps_in_window < 3
   OR public.campaign_soft_view_state.window_started_at < now() - interval '2 hours';
