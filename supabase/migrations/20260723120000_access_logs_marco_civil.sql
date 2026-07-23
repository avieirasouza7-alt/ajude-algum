-- Marco Civil da Internet (Lei 12.965/2014, art. 15):
-- guarda de registros de acesso (IP + data/hora) por no mínimo 6 meses.
-- Cole no SQL Editor do Supabase (projeto xpxgxnbfrgplvpbukvcp) e rode.

CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  path TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_logs_created_at_idx
  ON public.access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS access_logs_user_id_idx
  ON public.access_logs (user_id);
CREATE INDEX IF NOT EXISTS access_logs_action_idx
  ON public.access_logs (action);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read access logs" ON public.access_logs;
CREATE POLICY "Admins read access logs"
  ON public.access_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Sem INSERT direto do cliente: só via RPC SECURITY DEFINER (IP vem do servidor).
CREATE OR REPLACE FUNCTION public.record_access_log(
  p_action TEXT,
  p_ip TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_path TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_uid UUID := auth.uid();
  v_ip TEXT := NULLIF(trim(COALESCE(p_ip, '')), '');
  v_action TEXT := NULLIF(trim(COALESCE(p_action, '')), '');
BEGIN
  IF v_action IS NULL THEN
    RAISE EXCEPTION 'action required';
  END IF;
  IF v_ip IS NULL THEN
    v_ip := 'unknown';
  END IF;
  IF char_length(v_action) > 80 THEN
    v_action := left(v_action, 80);
  END IF;
  IF char_length(v_ip) > 64 THEN
    v_ip := left(v_ip, 64);
  END IF;

  INSERT INTO public.access_logs (
    user_id, action, ip_address, user_agent, path, entity_type, entity_id, details
  ) VALUES (
    v_uid,
    v_action,
    v_ip,
    NULLIF(left(COALESCE(p_user_agent, ''), 500), ''),
    NULLIF(left(COALESCE(p_path, ''), 300), ''),
    NULLIF(left(COALESCE(p_entity_type, ''), 80), ''),
    NULLIF(left(COALESCE(p_entity_id, ''), 120), ''),
    COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_access_logs_older_than_6_months()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.access_logs
  WHERE created_at < now() - interval '6 months';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.record_access_log(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_access_log(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.purge_access_logs_older_than_6_months() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_access_logs_older_than_6_months() TO service_role;

NOTIFY pgrst, 'reload schema';
