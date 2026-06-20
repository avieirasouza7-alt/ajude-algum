export type CampaignAlertSettings = {
  enabled: boolean;
  campaign_slug: string;
  message: string;
};

export const CAMPAIGN_ALERT_DEFAULTS: CampaignAlertSettings = {
  enabled: false,
  campaign_slug: "",
  message: "",
};

const DISMISS_KEY = "campaign-alert-dismissed";

const HIDDEN_PREFIXES = [
  "/admin",
  "/auth",
  "/painel",
  "/nova-campanha",
  "/editar",
  "/aceitar-termos",
];

export function isPublicCampaignAlertRoute(pathname: string) {
  return !HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function getCampaignAlertDismissKey(slug: string) {
  return `${DISMISS_KEY}:${slug}`;
}

export function isCampaignAlertDismissed(slug: string) {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(getCampaignAlertDismissKey(slug)) === "1";
}

export function dismissCampaignAlert(slug: string) {
  sessionStorage.setItem(getCampaignAlertDismissKey(slug), "1");
}
