/** Nome exibido no site para campanhas publicadas pela equipe. */
export const CAMPAIGN_ORGANIZER_LABEL = "Administração";

/** Nome exibido em comentários e mensagens de apoio. */
export const COMMENT_AUTHOR_LABEL = "Administrador";

export function campaignProgressPercent(raised: number, goal: number) {
  const safeGoal = Number(goal);
  const safeRaised = Number(raised);
  if (!Number.isFinite(safeGoal) || safeGoal <= 0) return 0;
  if (!Number.isFinite(safeRaised) || safeRaised <= 0) return 0;
  return Math.min(100, Math.round((safeRaised / safeGoal) * 100));
}

export function formatCampaignAdminSubtitle(campaign: {
  beneficiary_name: string;
  category: string;
  city: string;
  state: string;
  created_at: string;
  formatDate: (value: string) => string;
}) {
  const { beneficiary_name, category, city, state, created_at, formatDate } = campaign;
  return `${CAMPAIGN_ORGANIZER_LABEL} • Beneficiário: ${beneficiary_name} • ${category} • ${city}/${state} • ${formatDate(created_at)}`;
}
