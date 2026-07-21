/**
 * Segurança do embed da Bíblia Virtual.
 * Só permite origens da Bíblia — bloqueia outros apps (ex.: Torreflux da Play Store).
 *
 * Nunca aponte VITE_BIBLIA_VIRTUAL_URL para localhost:8080 nem para outro jogo.
 * Em produção só https://biblia-virtual.avieirasouza7.workers.dev é aceito.
 */

/** Única origem oficial em produção. */
export const BIBLIA_EMBED_PRODUCTION_ORIGIN = "https://biblia-virtual.avieirasouza7.workers.dev";

/** Porta local exclusiva da Bíblia (nunca 8080 — usada pelo Torreflux). */
export const BIBLIA_EMBED_LOCAL_PORT = 8090;

const BLOCKED_HOST_MARKERS = [
  "torreflux",
  "play.google.com",
  "play.google",
  "apps.apple.com",
] as const;

const BLOCKED_LOCAL_PORTS = new Set([8080, 8083, 5174, 3001]);

function normalizeOriginUrl(raw: string): string {
  return raw.trim().replace(/\/?$/, "/");
}

function parseUrlSafe(raw: string): URL | null {
  try {
    return new URL(normalizeOriginUrl(raw));
  } catch {
    return null;
  }
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BLOCKED_HOST_MARKERS.some((marker) => host.includes(marker));
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Origens permitidas para o iframe da Bíblia.
 * Qualquer outra URL (outro jogo, outra porta, Play Store) é rejeitada.
 */
export function isAllowedBibliaEmbedUrl(raw: string, opts?: { allowLocal?: boolean }): boolean {
  const url = parseUrlSafe(raw);
  if (!url) return false;

  if (isBlockedHost(url.hostname)) return false;

  const allowLocal = opts?.allowLocal ?? import.meta.env.DEV;

  // Produção oficial
  if (
    url.protocol === "https:" &&
    url.hostname === "biblia-virtual.avieirasouza7.workers.dev" &&
    (url.pathname === "/" || url.pathname === "")
  ) {
    return true;
  }

  // Só em desenvolvimento: Bíblia local na porta dedicada
  if (allowLocal && (url.protocol === "http:" || url.protocol === "https:")) {
    if (!isLocalHost(url.hostname)) return false;
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    if (BLOCKED_LOCAL_PORTS.has(port)) return false;
    if (port !== BIBLIA_EMBED_LOCAL_PORT) return false;
    return url.pathname === "/" || url.pathname === "";
  }

  return false;
}

/**
 * Resolve a URL do iframe com fallback seguro.
 * Se a env apontar para algo inválido (ex.: Torreflux), usa a Bíblia oficial.
 */
export function resolveBibliaEmbedUrl(candidate?: string | null): string {
  const fallback = normalizeOriginUrl(BIBLIA_EMBED_PRODUCTION_ORIGIN);
  const local = `http://localhost:${BIBLIA_EMBED_LOCAL_PORT}/`;

  const preferred =
    (candidate && candidate.trim()) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_BIBLIA_VIRTUAL_URL) ||
    (import.meta.env.DEV ? local : fallback);

  const normalized = normalizeOriginUrl(String(preferred));

  if (isAllowedBibliaEmbedUrl(normalized)) {
    return normalized;
  }

  if (import.meta.env.DEV) {
    console.error(
      "[segurança] URL de embed da Bíblia rejeitada (possível app externo). Usando origem oficial.",
      normalized,
    );
  }

  return fallback;
}

/** src final do iframe, sempre com embed=1. */
export function buildBibliaEmbedSrc(baseUrl?: string): string {
  const base = resolveBibliaEmbedUrl(baseUrl);
  return `${base}${base.includes("?") ? "&" : "?"}embed=1`;
}
