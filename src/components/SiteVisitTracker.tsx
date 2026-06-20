import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isPublicAdRoute } from "@/lib/adsense";
import { pulseSiteVisit, trackSiteVisit } from "@/lib/site-visits";

const PULSE_MS = 30_000;

export function SiteVisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isPublicAdRoute(pathname)) return;

    void trackSiteVisit();
    void pulseSiteVisit();

    const timer = window.setInterval(() => {
      void pulseSiteVisit();
    }, PULSE_MS);

    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
