-- Jardim da Esperança: mundo global, chat, ações e presença (multiplayer)

CREATE TABLE IF NOT EXISTS public.garden_world_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  revision BIGINT NOT NULL DEFAULT 1,
  raining BOOLEAN NOT NULL DEFAULT false,
  clearing BOOLEAN NOT NULL DEFAULT false,
  weather_until TIMESTAMPTZ,
  last_tick TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT garden_world_state_singleton CHECK (id = 'global')
);

CREATE TABLE IF NOT EXISTS public.garden_seedlings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_z DOUBLE PRECISION NOT NULL DEFAULT 0,
  growth DOUBLE PRECISION NOT NULL DEFAULT 0,
  water DOUBLE PRECISION NOT NULL DEFAULT 60,
  light DOUBLE PRECISION NOT NULL DEFAULT 60,
  fertilizer DOUBLE PRECISION NOT NULL DEFAULT 40,
  cleanliness DOUBLE PRECISION NOT NULL DEFAULT 100,
  pest_free DOUBLE PRECISION NOT NULL DEFAULT 100,
  beauty DOUBLE PRECISION NOT NULL DEFAULT 18,
  fertilizer_actions INTEGER NOT NULL DEFAULT 0,
  last_pruned_at TIMESTAMPTZ,
  total_care_actions INTEGER NOT NULL DEFAULT 0,
  last_care_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  caregivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.garden_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seedling_id TEXT NOT NULL REFERENCES public.garden_seedlings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('water', 'prune', 'fertilizer', 'clean', 'pest')),
  growth_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garden_actions_created_idx
  ON public.garden_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS garden_actions_user_idx
  ON public.garden_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS garden_actions_seedling_idx
  ON public.garden_actions (seedling_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.garden_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hidden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT garden_chat_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 280)
);

CREATE INDEX IF NOT EXISTS garden_chat_created_idx
  ON public.garden_chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS garden_chat_visible_idx
  ON public.garden_chat_messages (created_at DESC)
  WHERE hidden = false;

CREATE TABLE IF NOT EXISTS public.garden_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  selected_seedling_id TEXT REFERENCES public.garden_seedlings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS garden_presence_last_seen_idx
  ON public.garden_presence (last_seen DESC);

CREATE TABLE IF NOT EXISTS public.garden_care_cooldowns (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('water', 'prune', 'fertilizer', 'clean', 'pest')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);

CREATE TABLE IF NOT EXISTS public.garden_chat_cooldowns (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.garden_world_state TO authenticated;
GRANT SELECT ON public.garden_seedlings TO authenticated;
GRANT SELECT ON public.garden_actions TO authenticated;
GRANT SELECT ON public.garden_chat_messages TO authenticated;
GRANT SELECT ON public.garden_presence TO authenticated;
GRANT ALL ON public.garden_world_state TO service_role;
GRANT ALL ON public.garden_seedlings TO service_role;
GRANT ALL ON public.garden_actions TO service_role;
GRANT ALL ON public.garden_chat_messages TO service_role;
GRANT ALL ON public.garden_presence TO service_role;
GRANT ALL ON public.garden_care_cooldowns TO service_role;
GRANT ALL ON public.garden_chat_cooldowns TO service_role;

ALTER TABLE public.garden_world_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_seedlings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_care_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_chat_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read garden world" ON public.garden_world_state;
CREATE POLICY "Auth read garden world" ON public.garden_world_state
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read garden seedlings" ON public.garden_seedlings;
CREATE POLICY "Auth read garden seedlings" ON public.garden_seedlings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read garden actions" ON public.garden_actions;
CREATE POLICY "Auth read garden actions" ON public.garden_actions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth read visible garden chat" ON public.garden_chat_messages;
CREATE POLICY "Auth read visible garden chat" ON public.garden_chat_messages
  FOR SELECT TO authenticated
  USING (hidden = false OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Auth read garden presence" ON public.garden_presence;
CREATE POLICY "Auth read garden presence" ON public.garden_presence
  FOR SELECT TO authenticated USING (true);

-- Seed mundo global + 5 mudas iniciais
INSERT INTO public.garden_world_state (id, revision, raining, clearing, last_tick, updated_at)
VALUES ('global', 1, false, false, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.garden_seedlings (
  id, name, species, pos_x, pos_y, pos_z, growth, water, light, fertilizer,
  cleanliness, pest_free, beauty, fertilizer_actions, total_care_actions, last_care_at
) VALUES
  ('esperanca-central', 'Esperança Central', 'Ipê-amarelo', 0, 0, 0, 0, 60, 60, 40, 100, 100, 18, 0, 0, now()),
  ('muda-nascente', 'Muda do Nascente', 'Manacá-da-serra', -5, 0, -5, 12, 60, 60, 40, 100, 100, 18, 0, 0, now()),
  ('muda-abraco', 'Muda do Abraço', 'Jacarandá', 5, 0, -5, 18, 60, 60, 40, 100, 100, 18, 0, 0, now()),
  ('muda-uniao', 'Muda da União', 'Pau-brasil', -5, 0, 5, 8, 60, 60, 40, 100, 100, 18, 0, 0, now()),
  ('muda-futuro', 'Muda do Futuro', 'Quaresmeira', 5, 0, 5, 15, 60, 60, 40, 100, 100, 18, 0, 0, now())
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.garden_profile_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(p_user_id, 'admin') THEN
      COALESCE(NULLIF(trim(p.full_name), ''), 'Sem nome') || ' · Admin'
    ELSE
      COALESCE(NULLIF(trim(p.full_name), ''), 'Sem nome')
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.garden_ensure_active_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  status TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT account_status INTO status FROM public.profiles WHERE id = uid;
  IF status IS NULL OR status <> 'active' THEN
    RAISE EXCEPTION 'account not active';
  END IF;

  RETURN uid;
END;
$$;

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
  -- Checagem rápida sem lock: evita gravar (e emitir Realtime) a cada snapshot.
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
          'lastSeen', p.last_seen
        )
        ORDER BY p.last_seen DESC
      )
      FROM public.garden_presence p
      WHERE p.last_seen >= now() - interval '45 seconds'
    ), '[]'::json),
    'chat', COALESCE((
      SELECT json_agg(row_to_json(c) ORDER BY c.created_at ASC)
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

CREATE OR REPLACE FUNCTION public.garden_pulse_presence(p_selected_seedling_id TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := public.garden_ensure_active_user();

  INSERT INTO public.garden_presence (user_id, last_seen, selected_seedling_id)
  VALUES (
    uid,
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

  DELETE FROM public.garden_presence
  WHERE last_seen < now() - interval '2 minutes';

  RETURN json_build_object(
    'ok', true,
    'online', COALESCE((
      SELECT json_agg(
        json_build_object(
          'userId', p.user_id,
          'fullName', public.garden_profile_name(p.user_id),
          'selectedSeedlingId', p.selected_seedling_id,
          'lastSeen', p.last_seen
        )
        ORDER BY p.last_seen DESC
      )
      FROM public.garden_presence p
      WHERE p.last_seen >= now() - interval '45 seconds'
    ), '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.garden_leave_presence()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.garden_presence WHERE user_id = uid;
END;
$$;

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
  existing JSONB;
  updated BOOLEAN := false;
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

  -- Keep top 12 by lastCareAt
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

  -- Soft weather chance after care (~8%)
  IF random() < 0.08 AND NOT world.raining AND NOT world.clearing THEN
    UPDATE public.garden_world_state
    SET raining = true, clearing = false, weather_until = now() + interval '15 minutes', updated_at = now()
    WHERE id = 'global';
  END IF;

  -- Advance rain -> clearing when due
  IF world.raining AND world.weather_until IS NOT NULL AND world.weather_until <= now() THEN
    UPDATE public.garden_world_state
    SET raining = false, clearing = true, weather_until = now() + interval '45 seconds', updated_at = now()
    WHERE id = 'global';
  ELSIF world.clearing AND world.weather_until IS NOT NULL AND world.weather_until <= now() THEN
    UPDATE public.garden_world_state
    SET raining = false, clearing = false, weather_until = NULL, updated_at = now()
    WHERE id = 'global';
  END IF;

  -- Rain auto-waters all seedlings a bit when raining
  IF (SELECT raining FROM public.garden_world_state WHERE id = 'global') THEN
    UPDATE public.garden_seedlings
    SET water = LEAST(100, water + 8), updated_at = now();
  END IF;

  RETURN public.garden_get_snapshot();
END;
$$;

CREATE OR REPLACE FUNCTION public.garden_send_chat(p_body TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  cleaned TEXT;
  cd_until TIMESTAMPTZ;
  msg RECORD;
BEGIN
  uid := public.garden_ensure_active_user();
  cleaned := trim(BOTH FROM COALESCE(p_body, ''));
  cleaned := regexp_replace(cleaned, E'[\\u0000-\\u001F\\u007F]', '', 'g');

  IF char_length(cleaned) < 1 OR char_length(cleaned) > 280 THEN
    RAISE EXCEPTION 'invalid chat body';
  END IF;

  SELECT available_at INTO cd_until
  FROM public.garden_chat_cooldowns
  WHERE user_id = uid
  FOR UPDATE;

  IF cd_until IS NOT NULL AND cd_until > now() THEN
    RAISE EXCEPTION 'chat on cooldown';
  END IF;

  INSERT INTO public.garden_chat_messages (user_id, body)
  VALUES (uid, cleaned)
  RETURNING * INTO msg;

  INSERT INTO public.garden_chat_cooldowns (user_id, available_at)
  VALUES (uid, now() + interval '3 seconds')
  ON CONFLICT (user_id) DO UPDATE
  SET available_at = now() + interval '3 seconds';

  RETURN json_build_object(
    'id', msg.id,
    'userId', msg.user_id,
    'fullName', public.garden_profile_name(msg.user_id),
    'body', msg.body,
    'hidden', msg.hidden,
    'createdAt', msg.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.garden_hide_chat(p_message_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  msg RECORD;
BEGIN
  uid := public.garden_ensure_active_user();
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.garden_chat_messages
  SET hidden = true, hidden_by = uid, hidden_at = now()
  WHERE id = p_message_id
  RETURNING * INTO msg;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message not found';
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (
    uid,
    'garden_hide_chat',
    'garden_chat_messages',
    msg.id::text,
    jsonb_build_object('user_id', msg.user_id, 'body', left(msg.body, 120))
  );

  RETURN json_build_object('ok', true, 'id', msg.id);
END;
$$;

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
          'lastSeen', p.last_seen
        )
        ORDER BY p.last_seen DESC
      )
      FROM public.garden_presence p
      WHERE p.last_seen >= now() - interval '45 seconds'
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

REVOKE ALL ON FUNCTION public.garden_profile_name(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_ensure_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_apply_passive_tick(DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_get_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_pulse_presence(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_leave_presence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_care_action(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_send_chat(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_hide_chat(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_admin_overview() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.garden_get_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_pulse_presence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_leave_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_care_action(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_send_chat(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_hide_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_admin_overview() TO authenticated;

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_world_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_seedlings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_actions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_presence;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
