-- Jardim da Esperança: moderação de admin (silenciar, expulsar, banir)
-- + registro completo de eventos (entradas, saídas, chat, ações, punições)

-- ---------------------------------------------------------------------------
-- 1. Punições por jogador
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garden_moderation (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  kicked_at TIMESTAMPTZ,
  reason TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Registro de tudo que acontece no jogo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garden_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'join', 'leave', 'chat', 'care',
    'mute', 'unmute', 'kick', 'ban', 'unban', 'chat_hidden'
  )),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garden_events_created_idx
  ON public.garden_events (created_at DESC);
CREATE INDEX IF NOT EXISTS garden_events_user_idx
  ON public.garden_events (user_id, created_at DESC);

GRANT SELECT ON public.garden_moderation TO authenticated;
GRANT SELECT ON public.garden_events TO authenticated;
GRANT ALL ON public.garden_moderation TO service_role;
GRANT ALL ON public.garden_events TO service_role;

ALTER TABLE public.garden_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own or admin read garden moderation" ON public.garden_moderation;
CREATE POLICY "Own or admin read garden moderation" ON public.garden_moderation
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin read garden events" ON public.garden_events;
CREATE POLICY "Admin read garden events" ON public.garden_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 3. Helper para gravar eventos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_log_event(
  p_type TEXT,
  p_user UUID,
  p_actor UUID DEFAULT NULL,
  p_detail JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.garden_events (event_type, user_id, actor_id, detail)
  VALUES (p_type, p_user, p_actor, COALESCE(p_detail, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- 4. Triggers: chat, ações e ocultação viram eventos automaticamente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_event_on_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.garden_log_event(
    'chat', NEW.user_id, NULL,
    jsonb_build_object('messageId', NEW.id, 'body', left(NEW.body, 200))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS garden_chat_event_trg ON public.garden_chat_messages;
CREATE TRIGGER garden_chat_event_trg
  AFTER INSERT ON public.garden_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.garden_event_on_chat();

CREATE OR REPLACE FUNCTION public.garden_event_on_chat_hidden()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden AND NOT OLD.hidden THEN
    PERFORM public.garden_log_event(
      'chat_hidden', NEW.user_id, NEW.hidden_by,
      jsonb_build_object('messageId', NEW.id, 'body', left(NEW.body, 200))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS garden_chat_hidden_event_trg ON public.garden_chat_messages;
CREATE TRIGGER garden_chat_hidden_event_trg
  AFTER UPDATE OF hidden ON public.garden_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.garden_event_on_chat_hidden();

CREATE OR REPLACE FUNCTION public.garden_event_on_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.garden_log_event(
    'care', NEW.user_id, NULL,
    jsonb_build_object('seedlingId', NEW.seedling_id, 'kind', NEW.kind)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS garden_action_event_trg ON public.garden_actions;
CREATE TRIGGER garden_action_event_trg
  AFTER INSERT ON public.garden_actions
  FOR EACH ROW EXECUTE FUNCTION public.garden_event_on_action();

-- ---------------------------------------------------------------------------
-- 5. Banido não entra em nada (snapshot, presença, cuidado, chat)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_ensure_active_user()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  status TEXT;
  ban_until TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT account_status INTO status FROM public.profiles WHERE id = uid;
  IF status IS NULL OR status <> 'active' THEN
    RAISE EXCEPTION 'account not active';
  END IF;

  SELECT banned_until INTO ban_until FROM public.garden_moderation WHERE user_id = uid;
  IF ban_until IS NOT NULL AND ban_until > now() THEN
    RAISE EXCEPTION 'garden banned';
  END IF;

  RETURN uid;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Presença: registra entrada/saída e aplica expulsão
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
  removed INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.garden_presence WHERE user_id = uid;
  GET DIAGNOSTICS removed = ROW_COUNT;
  IF removed > 0 THEN
    PERFORM public.garden_log_event('leave', uid, NULL, jsonb_build_object('cause', 'exit'));
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Chat: silenciado não fala
-- ---------------------------------------------------------------------------
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
  mute_until TIMESTAMPTZ;
  msg RECORD;
BEGIN
  uid := public.garden_ensure_active_user();

  SELECT muted_until INTO mute_until FROM public.garden_moderation WHERE user_id = uid;
  IF mute_until IS NOT NULL AND mute_until > now() THEN
    RAISE EXCEPTION 'garden muted';
  END IF;

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

-- ---------------------------------------------------------------------------
-- 8. RPC de moderação (só admin): silenciar, expulsar, banir e desfazer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garden_admin_moderate(
  p_target UUID,
  p_action TEXT,
  p_minutes INTEGER DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  until_at TIMESTAMPTZ;
BEGIN
  uid := public.garden_ensure_active_user();
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_target IS NULL THEN
    RAISE EXCEPTION 'target required';
  END IF;
  IF p_target = uid THEN
    RAISE EXCEPTION 'cannot moderate self';
  END IF;
  IF public.has_role(p_target, 'admin') THEN
    RAISE EXCEPTION 'cannot moderate admin';
  END IF;
  IF p_action NOT IN ('mute', 'unmute', 'kick', 'ban', 'unban') THEN
    RAISE EXCEPTION 'invalid moderation action';
  END IF;

  INSERT INTO public.garden_moderation (user_id) VALUES (p_target)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_action = 'mute' THEN
    until_at := now() + make_interval(mins => GREATEST(COALESCE(p_minutes, 10), 1));
    UPDATE public.garden_moderation
    SET muted_until = until_at, reason = p_reason, updated_by = uid, updated_at = now()
    WHERE user_id = p_target;

  ELSIF p_action = 'unmute' THEN
    UPDATE public.garden_moderation
    SET muted_until = NULL, reason = p_reason, updated_by = uid, updated_at = now()
    WHERE user_id = p_target;

  ELSIF p_action = 'kick' THEN
    UPDATE public.garden_moderation
    SET kicked_at = now(), reason = p_reason, updated_by = uid, updated_at = now()
    WHERE user_id = p_target;
    DELETE FROM public.garden_presence WHERE user_id = p_target;

  ELSIF p_action = 'ban' THEN
    -- Sem minutos = banimento permanente (100 anos)
    until_at := CASE
      WHEN p_minutes IS NULL THEN now() + interval '100 years'
      ELSE now() + make_interval(mins => GREATEST(p_minutes, 1))
    END;
    UPDATE public.garden_moderation
    SET banned_until = until_at, kicked_at = now(), reason = p_reason, updated_by = uid, updated_at = now()
    WHERE user_id = p_target;
    DELETE FROM public.garden_presence WHERE user_id = p_target;

  ELSIF p_action = 'unban' THEN
    UPDATE public.garden_moderation
    SET banned_until = NULL, kicked_at = NULL, reason = p_reason, updated_by = uid, updated_at = now()
    WHERE user_id = p_target;
  END IF;

  PERFORM public.garden_log_event(
    p_action, p_target, uid,
    jsonb_build_object('minutes', p_minutes, 'reason', p_reason)
  );

  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (
    uid,
    'garden_' || p_action,
    'garden_moderation',
    p_target::text,
    jsonb_build_object('minutes', p_minutes, 'reason', p_reason)
  );

  RETURN json_build_object('ok', true, 'action', p_action, 'target', p_target, 'until', until_at);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Painel do admin: visão completa (online, punições, eventos, chat, ações)
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
          'mutedUntil', m.muted_until,
          'bannedUntil', m.banned_until
        )
        ORDER BY p.last_seen DESC
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

-- ---------------------------------------------------------------------------
-- 10. Permissões
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.garden_log_event(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garden_admin_moderate(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.garden_admin_moderate(UUID, TEXT, INTEGER, TEXT) TO authenticated;
