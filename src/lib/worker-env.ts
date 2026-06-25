import process from "node:process";

const KNOWN_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SITE_URL",
  "VITE_ADSENSE_CLIENT_ID",
  "VITE_ADSENSE_ENABLED",
  "VITE_ADSENSE_SLOT_HOME",
  "VITE_ADSENSE_SLOT_LIST",
  "VITE_ADSENSE_SLOT_CAMPAIGN",
] as const;

function readBinding(env: unknown, key: string): string | undefined {
  if (!env || typeof env !== "object") return undefined;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Cloudflare Worker bindings are passed on `fetch(request, env)` — sync into process.env for SSR. */
export function applyWorkerEnv(env: unknown) {
  for (const key of KNOWN_ENV_KEYS) {
    const value = readBinding(env, key);
    if (value) process.env[key] = value;
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (url) process.env.SUPABASE_URL = url;
  if (key) process.env.SUPABASE_PUBLISHABLE_KEY = key;
}
