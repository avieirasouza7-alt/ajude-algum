/** Fallback quando o perfil não tem nome cadastrado. */
export const COMMENT_AUTHOR_FALLBACK = "Sem nome";

export function formatCommentAuthorName(fullName?: string | null) {
  const name = (fullName ?? "").trim();
  return name || COMMENT_AUTHOR_FALLBACK;
}

export function campaignProgressPercent(raised: number, goal: number) {
  const safeGoal = Number(goal);
  const safeRaised = Number(raised);
  if (!Number.isFinite(safeGoal) || safeGoal <= 0) return 0;
  if (!Number.isFinite(safeRaised) || safeRaised <= 0) return 0;
  return Math.min(100, Math.round((safeRaised / safeGoal) * 100));
}

export function formatCampaignAdminSubtitle(campaign: {
  organizer_name?: string | null;
  beneficiary_name: string;
  category: string;
  city: string;
  state: string;
  created_at: string;
  formatDate: (value: string) => string;
}) {
  const { organizer_name, beneficiary_name, category, city, state, created_at, formatDate } =
    campaign;
  const organizer = formatCommentAuthorName(organizer_name);
  return `${organizer} • Beneficiário: ${beneficiary_name} • ${category} • ${city}/${state} • ${formatDate(created_at)}`;
}
