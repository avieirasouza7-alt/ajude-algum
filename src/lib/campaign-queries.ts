export const CAMPAIGN_CARD_SELECT =
  "id,slug,title,category,image_path,image_paths,goal_amount,raised_amount,city,state,featured,created_at";

/** Aplica filtros de campanhas públicas aprovadas e visíveis. */
export function applyPublicCampaignFilters<
  T extends { eq: (column: string, value: string | boolean) => T },
>(query: T): T {
  return query.eq("status", "approved").eq("hidden", false);
}

export function getSiteBaseUrl(request?: Request) {
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.VITE_SITE_URL ||
    "https://ajudealguemonline.com.br"
  );
}
