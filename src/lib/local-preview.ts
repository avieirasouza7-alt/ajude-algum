/**
 * Bíblia Virtual dentro do Ajude Alguém Online.
 * - Rota interna do site: /biblia-virtual
 * - App embutido (iframe) aponta para o Worker publicado
 */
export const BIBLIA_VIRTUAL_PATH = "/biblia-virtual";

/** URL do app da Bíblia (origem do iframe). */
const DEFAULT_BIBLIA_EMBED_URL = "https://biblia-virtual.avieirasouza7.workers.dev/";

export const BIBLIA_EMBED_URL = import.meta.env.DEV
  ? "http://localhost:8080/"
  : (import.meta.env.VITE_BIBLIA_VIRTUAL_URL || DEFAULT_BIBLIA_EMBED_URL).replace(/\/?$/, "/");

/** Sempre exibe o botão/card no site. */
export const SHOW_BIBLIA_VIRTUAL = true;

/**
 * Jogo Jardim da Esperança — botão no menu e card na home SEMPRE visíveis.
 * Nunca desligue SHOW_JARDIM / SHOW_JARDIM_HOME_CARD para “fechar” o jogo:
 * o acesso (jogar) é controlado por JARDIM_PUBLIC_OPEN + e-mail permitido.
 */
export const SHOW_JARDIM = true;

/**
 * Se true, qualquer usuário logado joga.
 * Se false (padrão), o público vê o botão mas não entra — só avieirasouza7@gmail.com.
 * Produção: VITE_JARDIM_ENABLED=true no wrangler para abrir ao público.
 */
export const JARDIM_PUBLIC_OPEN = import.meta.env.VITE_JARDIM_ENABLED === "true";

/** Contas que podem jogar enquanto o jardim está fechado ao público. */
export const JARDIM_ADMIN_EMAILS = ["avieirasouza7@gmail.com"] as const;

/**
 * Quem pode abrir o jogo 3D (não controla o botão no site).
 * Fechado = SOMENTE os e-mails da lista — não basta ser "admin" no banco
 * (outras contas admin não entram).
 */
export function canAccessJardim(
  user: { email?: string | null } | null | undefined,
  _isAdmin = false,
): boolean {
  if (JARDIM_PUBLIC_OPEN) return true;
  const email = user?.email?.trim().toLowerCase();
  return !!email && (JARDIM_ADMIN_EMAILS as readonly string[]).includes(email);
}

/**
 * Cards e seções grandes do jogo na home (galeria / convite longo).
 * Ficam desligados enquanto o jardim não está aberto ao público.
 */
export const SHOW_JARDIM_HOME_PROMO = JARDIM_PUBLIC_OPEN;

/**
 * Card compacto do jogo na home, ao lado do card da Bíblia.
 * Sempre visível — o botão do jogo não some do site.
 */
export const SHOW_JARDIM_HOME_CARD = SHOW_JARDIM;

/** @deprecated use BIBLIA_VIRTUAL_PATH — mantido para imports antigos */
export const BIBLIA_VIRTUAL_URL = BIBLIA_VIRTUAL_PATH;
