import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isPublicAdRoute } from "@/lib/adsense";
import { startSiteVisitPulse, trackSiteVisit } from "@/lib/site-visits";
import { trackAnalyticsPageView } from "@/lib/site-analytics";

function isPublicNow() {
  return isPublicAdRoute(window.location.pathname);
}

export function SiteVisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isPublicAdRoute(pathname)) return;

    void trackSiteVisit();
    trackAnalyticsPageView(pathname);
    return startSiteVisitPulse(isPublicNow);
  }, [pathname]);

  return null;
}
