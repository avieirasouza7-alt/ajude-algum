import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  isPublicAdRoute,
  resolveAdSlotId,
  type AdSensePlacement,
} from "@/lib/adsense";
import { useAdSenseConfig } from "@/hooks/use-adsense-config";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSlotProps = {
  placement?: AdSensePlacement;
  className?: string;
  label?: string;
};

export function AdSlot({
  placement = "home",
  className = "",
  label = "Publicidade",
}: AdSlotProps) {
  const config = useAdSenseConfig();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const slotId = resolveAdSlotId(config, placement);
  const pushed = useRef(false);

  const showAd =
    config.enabled && config.clientId && slotId && isPublicAdRoute(pathname);

  useEffect(() => {
    if (!showAd || pushed.current) return;

    const timer = window.setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch (error) {
        console.warn("[AdSense] não foi possível exibir o anúncio.", error);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [showAd, slotId, pathname]);

  if (!showAd) {
    return (
      <div
        data-ad-slot={placement}
        className={`flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground ${className}`}
        aria-hidden="true"
      >
        {config.clientId && !slotId
          ? `Configure o bloco AdSense "${placement}" no painel admin → Configurações`
          : label}
      </div>
    );
  }

  return (
    <div
      data-ad-slot={placement}
      className={`overflow-hidden rounded-xl border border-border/60 bg-muted/20 ${className}`}
      aria-label="Publicidade"
    >
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={config.clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
