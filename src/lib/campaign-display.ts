/** Nome exibido no site para campanhas publicadas pela equipe. */
export const CAMPAIGN_ORGANIZER_LABEL = "Administração";

/** Nome exibido em comentários e mensagens de apoio. */
export const COMMENT_AUTHOR_LABEL = "Administrador";

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
