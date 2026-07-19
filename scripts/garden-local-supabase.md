# Como subir o multiplayer do Jardim em Supabase LOCAL (sem tocar no banco online)
#
# Pré-requisitos:
# 1) Docker Desktop instalado e rodando
# 2) Neste projeto: npm install
#
# Comandos:
#   npx supabase start
#   npx supabase status -o env
#
# Copie as chaves locais para .env.local (não commitar):
#   VITE_SUPABASE_URL=http://127.0.0.1:54321
#   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key do status>
#   SUPABASE_URL=http://127.0.0.1:54321
#   SUPABASE_PUBLISHABLE_KEY=<anon key do status>
#
# Aplique as migrations (incluindo o multiplayer):
#   npx supabase db reset
#
# Depois:
#   npm run dev
#
# Teste com 2 contas autenticadas em /jardim e o admin em /admin/jardim.
