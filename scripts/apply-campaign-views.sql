-- Cole no Supabase → SQL Editor → Run (uma vez)
-- Conta visualizações de campanhas aprovadas e públicas

CREATE OR REPLACE FUNCTION public.increment_campaign_views(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaigns
  SET views = views + 1,
      updated_at = now()
  WHERE id = p_campaign_id
    AND status = 'approved'
    AND COALESCE(hidden, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_campaign_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_campaign_views(UUID) TO anon, authenticated;
