-- Após ganhar moeda: esvazia os vitais das mudas para o zero (próximo ciclo).
CREATE OR REPLACE FUNCTION public.garden_reset_vitals_new_cycle()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := public.garden_ensure_active_user();

  UPDATE public.garden_seedlings
  SET
    water = 0,
    light = 0,
    fertilizer = 0,
    cleanliness = 0,
    pest_free = 0,
    beauty = 0,
    updated_at = now();

  UPDATE public.garden_world_state
  SET
    revision = revision + 1,
    updated_at = now()
  WHERE id = 'global';

  RETURN public.garden_get_snapshot();
END;
$$;

REVOKE ALL ON FUNCTION public.garden_reset_vitals_new_cycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_reset_vitals_new_cycle() TO authenticated;
