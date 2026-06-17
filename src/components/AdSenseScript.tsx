import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isPublicAdRoute } from "@/lib/adsense";
import { useAdSenseConfig } from "@/hooks/use-adsense-config";

export function AdSenseScript() {
  const config = useAdSenseConfig();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!config.enabled || !config.clientId || !isPublicAdRoute(pathname)) return;
    if (document.querySelector('script[data-adsense="true"]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.clientId)}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsense = "true";
    document.head.appendChild(script);
  }, [config.enabled, config.clientId, pathname]);

  return null;
}
