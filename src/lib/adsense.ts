export type AdSensePlacement = "home" | "campaign" | "list";

export type AdSenseConfig = {
  enabled: boolean;
  clientId: string;
  slots: Record<AdSensePlacement, string>;
};

export type AdSenseSettings = {
  enabled: boolean;
  client_id: string;
  slot_home: string;
  slot_campaign: string;
  slot_list: string;
};

export const ADSENSE_SETTINGS_DEFAULTS: AdSenseSettings = {
  enabled: false,
  client_id: "",
  slot_home: "",
  slot_campaign: "",
  slot_list: "",
};

const PRIVATE_PREFIXES = [
  "/admin",
  "/auth",
  "/painel",
  "/nova-campanha",
  "/editar",
  "/aceitar-termos",
];

export function isPublicAdRoute(pathname: string) {
  return !PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function getAdSenseEnv(): AdSenseConfig {
  const clientId =
    (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim() ||
    (typeof process !== "undefined"
      ? (process.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim()
      : "") ||
    "";
  const enabledFlag =
    import.meta.env.VITE_ADSENSE_ENABLED ??
    (typeof process !== "undefined" ? process.env.VITE_ADSENSE_ENABLED : undefined);
  const enabled = enabledFlag !== "false" && (enabledFlag === "true" || !!clientId);

  const slot = (key: string) =>
    (import.meta.env[key as keyof ImportMetaEnv] as string | undefined)?.trim() ||
    (typeof process !== "undefined" ? (process.env[key] as string | undefined)?.trim() : "") ||
    "";

  return {
    enabled: enabled && !!clientId,
    clientId,
    slots: {
      home: slot("VITE_ADSENSE_SLOT_HOME"),
      campaign: slot("VITE_ADSENSE_SLOT_CAMPAIGN"),
      list: slot("VITE_ADSENSE_SLOT_LIST"),
    },
  };
}

export function mergeAdSenseConfig(
  env: AdSenseConfig,
  settings?: Partial<AdSenseSettings> | null,
): AdSenseConfig {
  if (!settings) return env;

  const clientId = settings.client_id?.trim() || env.clientId;
  const enabled =
    typeof settings.enabled === "boolean" ? settings.enabled && !!clientId : env.enabled;

  return {
    enabled,
    clientId,
    slots: {
      home: settings.slot_home?.trim() || env.slots.home,
      campaign: settings.slot_campaign?.trim() || env.slots.campaign,
      list: settings.slot_list?.trim() || env.slots.list,
    },
  };
}

export function resolveAdSlotId(config: AdSenseConfig, placement: AdSensePlacement) {
  return config.slots[placement]?.trim() ?? "";
}

/** ca-pub-xxx → pub-xxx (formato do ads.txt) */
export function toAdsTxtPublisherId(clientId: string) {
  return clientId.trim().replace(/^ca-/i, "");
}

export function buildAdsTxt(clientId: string) {
  const pub = toAdsTxtPublisherId(clientId);
  if (!pub) return "";
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}

export function resolveAdSenseClientId(
  env: AdSenseConfig,
  settings?: Partial<AdSenseSettings> | null,
): string {
  return mergeAdSenseConfig(env, settings).clientId;
}
