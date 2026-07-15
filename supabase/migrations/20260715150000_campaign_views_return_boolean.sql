DROP FUNCTION IF EXISTS public.increment_campaign_views(UUID);

CREATE FUNCTION public.increment_campaign_views(p_campaign_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.campaigns
  SET views = views + 1,
      updated_at = now()
  WHERE id = p_campaign_id
    AND status = 'approved'
    AND COALESCE(hidden, false) = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_campaign_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_campaign_views(UUID) TO anon, authenticated;
