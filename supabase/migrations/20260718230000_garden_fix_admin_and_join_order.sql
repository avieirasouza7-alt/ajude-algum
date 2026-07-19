-- Jardim: corrige o painel admin (erro "growth is ambiguous") e ordena os
-- jogadores online por ordem de entrada (quem entrou primeiro aparece em cima).

-- ---------------------------------------------------------------------------
-- 1. Crescimento passivo: versão corrigida (v_*) + trava de 20 segundos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_apply_passive_tick(p_seconds DOUBLE PRECISION DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  world RECORD;
  elapsed DOUBLE PRECISION;
  step DOUBLE PRECISION;
  remaining DOUBLE PRECISION;
  s RECORD;
  v_growth DOUBLE PRECISION;
  v_water DOUBLE PRECISION;
  v_light DOUBLE PRECISION;
  v_fertilizer DOUBLE PRECISION;
  v_cleanliness DOUBLE PRECISION;
  v_pest_free DOUBLE PRECISION;
  care_score DOUBLE PRECISION;
  gain DOUBLE PRECISION;
  last_tick_at TIMESTAMPTZ;
BEGIN
  SELECT last_tick INTO last_tick_at FROM public.garden_world_state WHERE id = 'global';
  IF last_tick_at IS NULL THEN
    RETURN;
  END IF;
  IF p_seconds IS NULL AND now() - last_tick_at < interval '20 seconds' THEN
    RETURN;
  END IF;

  SELECT * INTO world FROM public.garden_world_state WHERE id = 'global' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  elapsed := COALESCE(
    p_seconds,
    EXTRACT(EPOCH FROM (now() - world.last_tick))
  );
  elapsed := LEAST(GREATEST(elapsed, 0), 12 * 3600);
  IF elapsed < 0.5 THEN
    RETURN;
  END IF;

  FOR s IN SELECT * FROM public.garden_seedlings FOR UPDATE LOOP
    remaining := elapsed;
    v_growth := s.growth;
    v_water := s.water;
    v_light := s.light;
    v_fertilizer := s.fertilizer;
    v_cleanliness := s.cleanliness;
    v_pest_free := s.pest_free;

    WHILE remaining > 0 LOOP
      step := LEAST(60, remaining);
      care_score := (
        v_water * 0.2 + v_light * 0.1 + v_fertilizer * 0.42 + v_cleanliness * 0.14 + v_pest_free * 0.14
      ) / 100.0;
      gain := (0.0008 + care_score * 0.0035) * (1 + (v_fertilizer / 100.0) * 1.55) * step;
      v_growth := LEAST(2800, v_growth + gain);
      v_water := GREATEST(0, v_water - step * 0.05);
      v_light := GREATEST(0, v_light - step * 0.04);
      v_fertilizer := GREATEST(0, v_fertilizer - step * 0.015);
      v_cleanliness := GREATEST(0, v_cleanliness - step * 0.02);
      v_pest_free := GREATEST(0, v_pest_free - step * 0.018);
      remaining := remaining - step;
    END LOOP;

    UPDATE public.garden_seedlings
    SET
      growth = v_growth,
      water = v_water,
      light = v_light,
      fertilizer = v_fertilizer,
      cleanliness = v_cleanliness,
      pest_free = v_pest_free,
      updated_at = now()
    WHERE id = s.id;
  END LOOP;

  UPDATE public.garden_world_state
  SET last_tick = now(), updated_at = now()
  WHERE id = 'global';
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Cuidado nas mudas: versão corrigida (v_beauty / v_fertilizer_actions)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_care_action(
  p_seedling_id TEXT,
  p_kind TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  world RECORD;
  seedling RECORD;
  cd_until TIMESTAMPTZ;
  growth_gain DOUBLE PRECISION;
  v_beauty DOUBLE PRECISION;
  v_fertilizer_actions INTEGER;
  last_pruned TIMESTAMPTZ;
  caregivers JSONB;
  caregiver_key TEXT;
  full_name TEXT;
  new_caregivers JSONB := '[]'::jsonb;
  item JSONB;
  found BOOLEAN := false;
BEGIN
  uid := public.garden_ensure_active_user();

  IF p_kind NOT IN ('water', 'prune', 'fertilizer', 'clean', 'pest') THEN
    RAISE EXCEPTION 'invalid care kind';
  END IF;

  SELECT available_at INTO cd_until
  FROM public.garden_care_cooldowns
  WHERE user_id = uid AND kind = p_kind
  FOR UPDATE;

  IF cd_until IS NOT NULL AND cd_until > now() THEN
    RAISE EXCEPTION 'care on cooldown';
  END IF;

  SELECT * INTO world FROM public.garden_world_state WHERE id = 'global' FOR UPDATE;
  PERFORM public.garden_apply_passive_tick();

  SELECT * INTO seedling
  FROM public.garden_seedlings
  WHERE id = p_seedling_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'seedling not found';
  END IF;

  IF p_kind = 'water' AND world.raining THEN
    RAISE EXCEPTION 'rain is watering';
  END IF;

  IF p_kind = 'fertilizer' THEN
    growth_gain := 3.4 * (0.75 + (seedling.fertilizer / 100.0) * 1.35);
  ELSIF p_kind = 'prune' THEN
    growth_gain := 0.25 * 0.6;
  ELSE
    growth_gain := 0.25;
  END IF;

  v_beauty := seedling.beauty;
  v_fertilizer_actions := seedling.fertilizer_actions;
  last_pruned := seedling.last_pruned_at;

  IF p_kind = 'water' THEN
    seedling.water := LEAST(100, seedling.water + 22);
  ELSIF p_kind = 'prune' THEN
    seedling.light := LEAST(100, seedling.light + 22);
    v_beauty := LEAST(100, v_beauty + 20);
    last_pruned := now();
  ELSIF p_kind = 'fertilizer' THEN
    seedling.fertilizer := LEAST(100, seedling.fertilizer + 22 * 1.35);
    v_fertilizer_actions := v_fertilizer_actions + 1;
  ELSIF p_kind = 'clean' THEN
    seedling.cleanliness := LEAST(100, seedling.cleanliness + 22 * 1.4);
  ELSIF p_kind = 'pest' THEN
    seedling.pest_free := 100;
  END IF;

  seedling.growth := LEAST(2800, seedling.growth + growth_gain);
  seedling.total_care_actions := seedling.total_care_actions + 1;
  seedling.last_care_at := now();

  full_name := public.garden_profile_name(uid);
  caregiver_key := uid::text;
  caregivers := COALESCE(seedling.caregivers, '[]'::jsonb);

  FOR item IN SELECT * FROM jsonb_array_elements(caregivers) LOOP
    IF (item->>'userId') = caregiver_key THEN
      found := true;
      new_caregivers := new_caregivers || jsonb_build_array(
        jsonb_build_object(
          'userId', uid,
          'fullName', full_name,
          'lastCareAt', EXTRACT(EPOCH FROM now()) * 1000,
          'actions', COALESCE((item->>'actions')::int, 0) + 1
        )
      );
    ELSE
      new_caregivers := new_caregivers || jsonb_build_array(item);
    END IF;
  END LOOP;

  IF NOT found THEN
    new_caregivers := jsonb_build_array(
      jsonb_build_object(
        'userId', uid,
        'fullName', full_name,
        'lastCareAt', EXTRACT(EPOCH FROM now()) * 1000,
        'actions', 1
      )
    ) || new_caregivers;
  END IF;

  SELECT COALESCE(jsonb_agg(elem ORDER BY (elem->>'lastCareAt')::float8 DESC), '[]'::jsonb)
  INTO new_caregivers
  FROM (
    SELECT elem
    FROM jsonb_array_elements(new_caregivers) elem
    ORDER BY (elem->>'lastCareAt')::float8 DESC
    LIMIT 12
  ) t;

  UPDATE public.garden_seedlings
  SET
    growth = seedling.growth,
    water = seedling.water,
    light = seedling.light,
    fertilizer = seedling.fertilizer,
    cleanliness = seedling.cleanliness,
    pest_free = seedling.pest_free,
    beauty = v_beauty,
    fertilizer_actions = v_fertilizer_actions,
    last_pruned_at = last_pruned,
    total_care_actions = seedling.total_care_actions,
    last_care_at = seedling.last_care_at,
    caregivers = new_caregivers,
    updated_at = now()
  WHERE id = seedling.id;

  UPDATE public.garden_world_state
  SET revision = revision + 1, updated_at = now()
  WHERE id = 'global';

  INSERT INTO public.garden_care_cooldowns (user_id, kind, available_at)
  VALUES (uid, p_kind, now() + interval '10 seconds')
  ON CONFLICT (user_id, kind) DO UPDATE
  SET available_at = now() + interval '10 seconds';

  INSERT INTO public.garden_actions (user_id, seedling_id, kind, growth_delta)
  VALUES (uid, seedling.id, p_kind, growth_gain);

  IF random() < 0.08 AND NOT world.raining AND NOT world.clearing THEN
    UPDATE public.garden_world_state
    SET raining = true, clearing = false, weather_until = now() + interval '15 minutes', updated_at = now()
    WHERE id = 'global';
  END IF;

  IF world.raining AND world.weather_until IS NOT NULL AND world.weather_until <= now() THEN
    UPDATE public.garden_world_state
    SET raining = false, clearing = true, weather_until = now() + interval '45 seconds', updated_at = now()
    WHERE id = 'global';
  ELSIF world.clearing AND world.weather_until IS NOT NULL AND world.weather_until <= now() THEN
    UPDATE public.garden_world_state
    SET raining = false, clearing = false, weather_until = NULL, updated_at = now()
    WHERE id = 'global';
  END IF;

  IF (SELECT raining FROM public.garden_world_state WHERE id = 'global') THEN
    UPDATE public.garden_seedlings
    SET water = LEAST(100, water + 8), updated_at = now();
  END IF;

  RETURN public.garden_get_snapshot();
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Hora de entrada: quem entrou primeiro aparece primeiro
-- ---------------------------------------------------------------------------
ALTER TABLE public.garden_presence
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------------------------------------------------------------------------
-- 4. Snapshot do jogo: online ordenado por ordem de entrada
-- ---------------------------------------------------------------------------
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
        WHERE m.hidden = false OR public.has_role(uid, 'admin')
        ORDER BY m.created_at DESC
        LIMIT 80
      ) c
    ), '[]'::json),
    'serverNow', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Presença: mantém joined_at e ordena por ordem de entrada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_pulse_presence(p_selected_seedling_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  kicked TIMESTAMPTZ;
  is_new BOOLEAN;
BEGIN
  uid := public.garden_ensure_active_user();

  -- Expulsão vale por 2 minutos: o cliente sai na hora e não volta sozinho.
  SELECT kicked_at INTO kicked FROM public.garden_moderation WHERE user_id = uid;
  IF kicked IS NOT NULL AND kicked > now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'garden kicked';
  END IF;

  is_new := NOT EXISTS (SELECT 1 FROM public.garden_presence WHERE user_id = uid);

  INSERT INTO public.garden_presence (user_id, last_seen, joined_at, selected_seedling_id)
  VALUES (
    uid,
    now(),
    now(),
    CASE
      WHEN p_selected_seedling_id IS NULL THEN NULL
      WHEN EXISTS (SELECT 1 FROM public.garden_seedlings WHERE id = p_selected_seedling_id)
        THEN p_selected_seedling_id
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    last_seen = now(),
    selected_seedling_id = COALESCE(EXCLUDED.selected_seedling_id, public.garden_presence.selected_seedling_id);

  IF is_new THEN
    PERFORM public.garden_log_event('join', uid);
  END IF;

  -- Presenças vencidas saem do jardim (e ficam registradas)
  WITH gone AS (
    DELETE FROM public.garden_presence
    WHERE last_seen < now() - interval '2 minutes'
    RETURNING user_id
  )
  INSERT INTO public.garden_events (event_type, user_id, detail)
  SELECT 'leave', gone.user_id, jsonb_build_object('cause', 'timeout')
  FROM gone;

  RETURN json_build_object(
    'ok', true,
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
    ), '[]'::json)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Painel admin: online por ordem de entrada + tudo funcionando
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_admin_overview()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := public.garden_ensure_active_user();
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.garden_apply_passive_tick();

  RETURN json_build_object(
    'onlineCount', (
      SELECT count(*)::int FROM public.garden_presence
      WHERE last_seen >= now() - interval '45 seconds'
    ),
    'online', COALESCE((
      SELECT json_agg(
        json_build_object(
          'userId', p.user_id,
          'fullName', public.garden_profile_name(p.user_id),
          'selectedSeedlingId', p.selected_seedling_id,
          'lastSeen', p.last_seen,
          'joinedAt', p.joined_at,
          'mutedUntil', m.muted_until,
          'bannedUntil', m.banned_until
        )
        ORDER BY p.joined_at ASC, p.user_id
      )
      FROM public.garden_presence p
      LEFT JOIN public.garden_moderation m ON m.user_id = p.user_id
      WHERE p.last_seen >= now() - interval '45 seconds'
    ), '[]'::json),
    'moderation', COALESCE((
      SELECT json_agg(
        json_build_object(
          'userId', m.user_id,
          'fullName', public.garden_profile_name(m.user_id),
          'mutedUntil', m.muted_until,
          'bannedUntil', m.banned_until,
          'kickedAt', m.kicked_at,
          'reason', m.reason,
          'updatedAt', m.updated_at
        )
        ORDER BY m.updated_at DESC
      )
      FROM public.garden_moderation m
      WHERE (m.muted_until IS NOT NULL AND m.muted_until > now())
         OR (m.banned_until IS NOT NULL AND m.banned_until > now())
    ), '[]'::json),
    'events', COALESCE((
      SELECT json_agg(row_to_json(e) ORDER BY e."createdAt" DESC)
      FROM (
        SELECT
          ev.id,
          ev.event_type AS "eventType",
          ev.user_id AS "userId",
          CASE WHEN ev.user_id IS NULL THEN NULL
               ELSE public.garden_profile_name(ev.user_id) END AS "fullName",
          CASE WHEN ev.actor_id IS NULL THEN NULL
               ELSE public.garden_profile_name(ev.actor_id) END AS "actorName",
          ev.detail,
          ev.created_at AS "createdAt"
        FROM public.garden_events ev
        ORDER BY ev.created_at DESC
        LIMIT 120
      ) e
    ), '[]'::json),
    'recentActions', COALESCE((
      SELECT json_agg(row_to_json(a) ORDER BY a."createdAt" DESC)
      FROM (
        SELECT
          ga.id,
          ga.user_id AS "userId",
          public.garden_profile_name(ga.user_id) AS "fullName",
          ga.seedling_id AS "seedlingId",
          gs.name AS "seedlingName",
          ga.kind,
          ga.growth_delta AS "growthDelta",
          ga.created_at AS "createdAt"
        FROM public.garden_actions ga
        JOIN public.garden_seedlings gs ON gs.id = ga.seedling_id
        ORDER BY ga.created_at DESC
        LIMIT 40
      ) a
    ), '[]'::json),
    'recentChat', COALESCE((
      SELECT json_agg(row_to_json(c) ORDER BY c."createdAt" DESC)
      FROM (
        SELECT
          m.id,
          m.user_id AS "userId",
          public.garden_profile_name(m.user_id) AS "fullName",
          m.body,
          m.hidden,
          m.created_at AS "createdAt"
        FROM public.garden_chat_messages m
        ORDER BY m.created_at DESC
        LIMIT 60
      ) c
    ), '[]'::json),
    'world', (
      SELECT json_build_object(
        'revision', w.revision,
        'raining', w.raining,
        'clearing', w.clearing,
        'updatedAt', w.updated_at
      )
      FROM public.garden_world_state w
      WHERE w.id = 'global'
    )
  );
END;
$$;
