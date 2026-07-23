-- Fix: após moeda, barras não podem voltar cheias por race/tick.
-- Rode no SQL Editor do Supabase (projeto xpxgxnbfrgplvpbukvcp).

ALTER TABLE public.garden_world_state
  ADD COLUMN IF NOT EXISTS pending_vitals_reset BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.garden_apply_pending_vitals_reset()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_pending BOOLEAN := false;
BEGIN
  SELECT COALESCE(pending_vitals_reset, false) INTO was_pending
  FROM public.garden_world_state
  WHERE id = 'global'
  FOR UPDATE;

  IF NOT was_pending THEN
    RETURN false;
  END IF;

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
    pending_vitals_reset = false,
    revision = revision + 1,
    updated_at = now()
  WHERE id = 'global';

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.garden_reset_vitals_new_cycle()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revision BIGINT;
BEGIN
  PERFORM public.garden_ensure_active_user();

  UPDATE public.garden_world_state
  SET
    pending_vitals_reset = true,
    revision = revision + 1,
    updated_at = now()
  WHERE id = 'global';

  PERFORM public.garden_apply_pending_vitals_reset();

  /* Garantia extra: zera de novo mesmo se o pending já tiver sido limpo. */
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
    pending_vitals_reset = false,
    revision = revision + 1,
    updated_at = now()
  WHERE id = 'global'
  RETURNING revision INTO v_revision;

  RETURN json_build_object(
    'ok', true,
    'reset', true,
    'revision', v_revision,
    'serverNow', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.garden_apply_pending_vitals_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_reset_vitals_new_cycle() TO authenticated;

NOTIFY pgrst, 'reload schema';
