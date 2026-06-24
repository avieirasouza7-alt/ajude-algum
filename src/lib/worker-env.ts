import process from "node:process";

/** Cloudflare Worker bindings are passed on `fetch(request, env)` — sync into process.env for SSR. */
export function applyWorkerEnv(env: unknown) {
  if (!env || typeof env !== "object") return;

  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (url) process.env.SUPABASE_URL = url;
  if (key) process.env.SUPABASE_PUBLISHABLE_KEY = key;
}
