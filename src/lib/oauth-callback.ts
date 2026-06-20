import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const OAUTH_HANDLED_KEY = "aa-oauth-handled";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authError =
    params.get("error_description") ??
    params.get("error") ??
    hash.get("error_description") ??
    hash.get("error");
  if (!authError) return null;
  return decodeURIComponent(authError.replace(/\+/g, " "));
}

function hasOAuthCode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("code"));
}

/** Evita processar o mesmo retorno OAuth duas vezes (Strict Mode / remount). */
function markOAuthHandled(code: string): boolean {
  const key = `${OAUTH_HANDLED_KEY}:${code}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  return true;
}

/**
 * Conclui login OAuth (Google). O Supabase já troca o código automaticamente
 * (detectSessionInUrl); aqui só aguardamos a sessão — sem chamar exchange duas vezes.
 */
export async function completeOAuthCallback(options: {
  cleanPath: string;
  onAuthenticated?: (user: User) => Promise<void>;
}): Promise<{ status: "idle" | "success" | "error"; message?: string }> {
  const oauthError = readOAuthError();
  if (oauthError) {
    window.history.replaceState({}, "", options.cleanPath);
    return { status: "error", message: oauthError };
  }

  if (!hasOAuthCode()) return { status: "idle" };

  const code = new URLSearchParams(window.location.search).get("code")!;
  if (!markOAuthHandled(code)) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        window.history.replaceState({}, "", options.cleanPath);
        return { status: "success" };
      }
      await sleep(200);
    }
    return { status: "idle" };
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      window.history.replaceState({}, "", options.cleanPath);
      if (options.onAuthenticated) await options.onAuthenticated(data.session.user);
      return { status: "success" };
    }
    await sleep(200);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    window.history.replaceState({}, "", options.cleanPath);
    if (options.onAuthenticated) await options.onAuthenticated(data.session.user);
    return { status: "success" };
  }

  window.history.replaceState({}, "", options.cleanPath);
  if (error) {
    return {
      status: "error",
      message: "Não foi possível concluir o login com Google.",
    };
  }

  return {
    status: "error",
    message: "Não foi possível concluir o login com Google.",
  };
}
