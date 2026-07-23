-- Ativa realtime na tabela reports (aviso urgente de denúncia para admin).
-- Cole no SQL Editor se o banner não atualizar na hora.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
