const PUBLIC_REDIRECT_KEY = "ajude_alguem_auth_redirect";
const ADMIN_REDIRECT_KEY = "ajude_alguem_admin_redirect";

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

export function saveAuthRedirect(path: string) {
  if (typeof window === "undefined" || !path.startsWith("/")) return;
  const key = isAdminPath(path) ? ADMIN_REDIRECT_KEY : PUBLIC_REDIRECT_KEY;
  sessionStorage.setItem(key, path);
}

export function saveAdminRedirect(path = "/admin") {
  if (typeof window === "undefined" || !path.startsWith("/admin")) return;
  sessionStorage.setItem(ADMIN_REDIRECT_KEY, path);
}

export function peekPublicRedirect() {
  if (typeof window === "undefined") return null;
  const path = sessionStorage.getItem(PUBLIC_REDIRECT_KEY);
  return path?.startsWith("/") && !isAdminPath(path) ? path : null;
}

export function peekAdminRedirect() {
  if (typeof window === "undefined") return null;
  const path = sessionStorage.getItem(ADMIN_REDIRECT_KEY);
  return path?.startsWith("/admin") ? path : null;
}

/** Após login/cadastro no site público — nunca manda para /admin. */
export function consumePublicAuthRedirect(fallback = "/painel") {
  const path = peekPublicRedirect();
  if (path) sessionStorage.removeItem(PUBLIC_REDIRECT_KEY);
  return path ?? fallback;
}

/** Após login em /admin/entrar. */
export function consumeAdminAuthRedirect(fallback = "/admin") {
  const path = peekAdminRedirect();
  if (path) sessionStorage.removeItem(ADMIN_REDIRECT_KEY);
  return path ?? fallback;
}

/** @deprecated use consumePublicAuthRedirect ou consumeAdminAuthRedirect */
export function consumeAuthRedirect(fallback = "/painel") {
  return consumePublicAuthRedirect(fallback);
}

export function clearAuthRedirects() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PUBLIC_REDIRECT_KEY);
  sessionStorage.removeItem(ADMIN_REDIRECT_KEY);
}

export function normalizeRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return undefined;
  return value;
}

export function normalizePublicRedirect(value: unknown) {
  const path = normalizeRedirect(value);
  if (!path || isAdminPath(path)) return undefined;
  return path;
}
