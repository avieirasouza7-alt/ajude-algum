-- Rodar no SQL Editor do Supabase (produção)
-- Corações / curtidas em comentários (mensagens de apoio)
CREATE TABLE IF NOT EXISTS public.comment_hearts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_hearts_unique UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_hearts_comment ON public.comment_hearts(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_hearts_user ON public.comment_hearts(user_id);

GRANT SELECT ON public.comment_hearts TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_hearts TO authenticated;
GRANT ALL ON public.comment_hearts TO service_role;

ALTER TABLE public.comment_hearts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone views comment hearts" ON public.comment_hearts;
CREATE POLICY "Anyone views comment hearts"
  ON public.comment_hearts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth users heart comments" ON public.comment_hearts;
CREATE POLICY "Auth users heart comments"
  ON public.comment_hearts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove own hearts" ON public.comment_hearts;
CREATE POLICY "Users remove own hearts"
  ON public.comment_hearts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
