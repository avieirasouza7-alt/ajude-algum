-- Jardim: corrige ambiguidade de variáveis nas RPCs + selo " · Admin" no nome

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
BEGIN
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
