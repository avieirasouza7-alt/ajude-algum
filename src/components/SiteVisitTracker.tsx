import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isPublicAdRoute } from "@/lib/adsense";
import { trackSiteVisit } from "@/lib/site-visits";

export function SiteVisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isPublicAdRoute(pathname)) return;
    trackSiteVisit();
  }, [pathname]);

  return null;
}
