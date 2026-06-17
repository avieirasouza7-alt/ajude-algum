import type { AuthError } from "@supabase/supabase-js";

export function formatAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) return "Erro desconhecido.";

  const code = "code" in error ? error.code : undefined;
  const message = error.message ?? "";

  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada e o spam.";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "E-mail ou senha incorretos.";
  }
  if (/user already registered/i.test(message)) {
    return "Este e-mail já está cadastrado. Use a aba Entrar.";
  }
  if (/signup is disabled/i.test(message)) {
    return "Cadastro por e-mail está desativado no momento.";
  }

  return message || "Não foi possível concluir. Tente novamente.";
}
