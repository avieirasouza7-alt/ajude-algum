-- Reset robusto das barras de cuidado após ganhar moeda.
-- Não depende de garden_get_snapshot para gravar o zero.
CREATE OR REPLACE FUNCTION public.garden_reset_vitals_new_cycle()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  result JSON;
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

  /* Snapshot fresco depois do UPDATE (vitais já em 0). */
  result := public.garden_get_snapshot();
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    /* Se o snapshot falhar, ainda assim os vitais foram zerados —
       devolve confirmação mínima para o cliente buscar de novo. */
    RETURN json_build_object(
      'ok', true,
      'reset', true,
      'error', SQLERRM,
      'serverNow', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.garden_reset_vitals_new_cycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_reset_vitals_new_cycle() TO authenticated;

NOTIFY pgrst, 'reload schema';
