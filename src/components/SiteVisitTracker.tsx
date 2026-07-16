import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isPublicAdRoute } from "@/lib/adsense";
import { useAuth } from "@/hooks/use-auth";
import { startSiteVisitPulse, trackSiteVisit } from "@/lib/site-visits";
import { trackAnalyticsPageView } from "@/lib/site-analytics";
import { pulseSoftCampaignViews } from "@/lib/soft-views-pulse";

function isPublicNow() {
  return isPublicAdRoute(window.location.pathname);
}

export function SiteVisitTracker() {
  const { isAdmin, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading || isAdmin) return;
    if (!isPublicAdRoute(pathname)) return;

    void trackSiteVisit();
    trackAnalyticsPageView(pathname);
    pulseSoftCampaignViews();
    return startSiteVisitPulse(isPublicNow);
  }, [pathname, isAdmin, loading]);

  return null;
}
