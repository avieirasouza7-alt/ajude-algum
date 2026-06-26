import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getGaMeasurementId, isGaEnabled, trackPageView } from "@/lib/analytics";

function ensureGtag(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };

  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

export function GoogleAnalytics() {
  const { isAdmin, loading } = useAuth();
  const initialized = useRef(false);
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });

  useEffect(() => {
    if (!isGaEnabled() || initialized.current || loading || isAdmin) return;
    ensureGtag(getGaMeasurementId());
    initialized.current = true;
  }, [isAdmin, loading]);

  useEffect(() => {
    if (!isGaEnabled() || loading || isAdmin) return;
    trackPageView(`${pathname}${searchStr}`);
  }, [pathname, searchStr, isAdmin, loading]);

  return null;
}
