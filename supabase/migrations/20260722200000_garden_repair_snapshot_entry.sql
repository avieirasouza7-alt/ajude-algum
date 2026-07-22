-- REPARO: restaura o jardim se o SQL anterior quebrou a entrada.
-- Cole tudo no SQL Editor (projeto xpxgxnbfrgplvpbukvcp) e rode.

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
  WHERE id = 'global';

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
BEGIN
  PERFORM public.garden_ensure_active_user();

  UPDATE public.garden_world_state
  SET
    pending_vitals_reset = true,
    revision = revision + 1,
    updated_at = now()
  WHERE id = 'global';

  PERFORM public.garden_apply_pending_vitals_reset();

  /* Não chama garden_get_snapshot aqui (evita erro em cascata). */
  RETURN json_build_object('ok', true, 'reset', true, 'serverNow', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.garden_get_snapshot()
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
  PERFORM public.garden_apply_passive_tick();

  BEGIN
    PERFORM public.garden_apply_pending_vitals_reset();
  EXCEPTION
    WHEN OTHERS THEN
      NULL; /* Nunca impede entrar no jardim */
  END;

  DELETE FROM public.garden_chat_messages
  WHERE created_at < now() - interval '15 minutes';

  SELECT json_build_object(
    'world', (
      SELECT json_build_object(
        'id', w.id,
        'revision', w.revision,
        'raining', w.raining,
        'clearing', w.clearing,
        'weather_until', w.weather_until,
        'last_tick', w.last_tick,
        'updated_at', w.updated_at
      )
      FROM public.garden_world_state w
      WHERE w.id = 'global'
    ),
    'seedlings', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'species', s.species,
          'position', json_build_array(s.pos_x, s.pos_y, s.pos_z),
          'growth', s.growth,
          'water', s.water,
          'light', s.light,
          'fertilizer', s.fertilizer,
          'cleanliness', s.cleanliness,
          'pestFree', s.pest_free,
          'beauty', s.beauty,
          'fertilizerActions', s.fertilizer_actions,
          'lastPrunedAt', COALESCE(EXTRACT(EPOCH FROM s.last_pruned_at) * 1000, 0),
          'totalCareActions', s.total_care_actions,
          'lastCareAt', EXTRACT(EPOCH FROM s.last_care_at) * 1000,
          'caregivers', s.caregivers
        )
        ORDER BY s.id
      )
      FROM public.garden_seedlings s
    ), '[]'::json),
    'online', COALESCE((
      SELECT json_agg(
        json_build_object(
          'userId', p.user_id,
          'fullName', public.garden_profile_name(p.user_id),
          'selectedSeedlingId', p.selected_seedling_id,
          'lastSeen', p.last_seen,
          'joinedAt', p.joined_at
        )
        ORDER BY p.joined_at ASC, p.user_id
      )
      FROM public.garden_presence p
      WHERE p.last_seen >= now() - interval '45 seconds'
    ), '[]'::json),
    'chat', COALESCE((
      SELECT json_agg(row_to_json(c) ORDER BY c."createdAt" ASC)
      FROM (
        SELECT
          m.id,
          m.user_id AS "userId",
          public.garden_profile_name(m.user_id) AS "fullName",
          m.body,
          m.hidden,
          m.created_at AS "createdAt"
        FROM public.garden_chat_messages m
        WHERE m.created_at >= now() - interval '15 minutes'
          AND (m.hidden = false OR public.has_role(uid, 'admin'))
        ORDER BY m.created_at DESC
        LIMIT 40
      ) c
    ), '[]'::json),
    'serverNow', now()
  ) INTO result;

  RETURN result;
END;
$$;

/* Garante permissões das funções do jardim */
GRANT EXECUTE ON FUNCTION public.garden_get_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_reset_vitals_new_cycle() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_apply_pending_vitals_reset() TO authenticated;

NOTIFY pgrst, 'reload schema';
