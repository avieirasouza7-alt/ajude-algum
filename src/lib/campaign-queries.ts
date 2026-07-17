export const CAMPAIGN_CARD_SELECT =
  "id,slug,title,category,image_path,image_paths,goal_amount,raised_amount,city,state,featured,created_at,views,soft_views";

/** Aplica filtros de campanhas públicas aprovadas e visíveis. */
export function applyPublicCampaignFilters<
  T extends { eq: (column: string, value: string | boolean) => T },
>(query: T): T {
  return query.eq("status", "approved").eq("hidden", false);
}

/** URL canônica do site para sitemap (sempre o domínio público). */
export function getSiteBaseUrl(_request?: Request) {
  return (
    process.env.VITE_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://ajudealguemonline.com.br"
  ).replace(/\/$/, "");
}
