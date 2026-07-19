-- Jardim: limita o crescimento passivo a 1 gravação a cada 20s
-- (evita loop de atualizações que fazia o status piscar "Erro de conexão")

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
