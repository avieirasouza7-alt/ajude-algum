export function getGaMeasurementId(): string {
  return (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() ?? "";
}

export function isGaEnabled(): boolean {
  const id = getGaMeasurementId();
  return /^G-[A-Z0-9]+$/i.test(id);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(pagePath: string) {
  if (!isGaEnabled() || typeof window.gtag !== "function") return;
  window.gtag("config", getGaMeasurementId(), { page_path: pagePath });
}

export function trackGaEvent(eventName: string, params?: Record<string, unknown>) {
  if (!isGaEnabled() || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}
