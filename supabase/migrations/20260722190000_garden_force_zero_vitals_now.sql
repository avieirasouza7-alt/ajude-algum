-- Zera as barras AGORA (emergência se o reset pós-moeda falhou).
-- Rode no SQL Editor do projeto de produção (xpxgxnbfrgplvpbukvcp).
-- Não chama RPC (precisa de usuário logado); só UPDATE direto.

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
  revision = revision + 1,
  updated_at = now()
WHERE id = 'global';
