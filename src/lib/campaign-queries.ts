export const CAMPAIGN_CARD_SELECT =
  "id,slug,title,category,image_path,image_paths,goal_amount,raised_amount,city,state,featured";

export function applyPublicCampaignFilters<Q extends { eq: (column: string, value: unknown) => Q }>(
  query: Q,
): Q {
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
