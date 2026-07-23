import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const POLL_MS = 12_000;

async function countOpenReports(): Promise<number> {
  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Monitora denúncias abertas para o admin — prioridade máxima.
 * Polling curto + realtime INSERT/UPDATE.
 */
export function useOpenReportsAlert() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [flash, setFlash] = useState(false);
  const prevCount = useRef<number | null>(null);
  const notifiedIds = useRef(new Set<string>());

  const enabled = !loading && isAdmin;

  const { data: openCount = 0 } = useQuery({
    queryKey: ["admin", "open-reports-count"],
    queryFn: countOpenReports,
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const bump = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin", "open-reports-count"] });
    void qc.invalidateQueries({ queryKey: ["admin", "reports"] });
  }, [qc]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("urgent-reports-alert")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          bump();
          if (payload.eventType === "INSERT") {
            const row = payload.new as { id?: string; resolved?: boolean };
            if (row.id && !row.resolved && !notifiedIds.current.has(row.id)) {
              notifiedIds.current.add(row.id);
              setFlash(true);
              window.setTimeout(() => setFlash(false), 4000);
              try {
                if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                  new Notification("URGENTE — Denúncia", {
                    body: "Nova denúncia no Ajude Alguém. Abra o painel agora.",
                    tag: "denuncia-urgente",
                  });
                }
              } catch {
                /* ignore */
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, bump]);

  useEffect(() => {
    if (!enabled) return;
    if (prevCount.current === null) {
      prevCount.current = openCount;
      return;
    }
    if (openCount > prevCount.current) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 4000);
    }
    prevCount.current = openCount;
  }, [enabled, openCount]);

  /* Pisca o título da aba enquanto houver denúncia aberta */
  useEffect(() => {
    if (!enabled || openCount <= 0) return;
    const original = document.title;
    let on = false;
    const id = window.setInterval(() => {
      on = !on;
      document.title = on
        ? `🚨 URGENTE DENÚNCIA (${openCount})`
        : original;
    }, 1600);
    return () => {
      window.clearInterval(id);
      document.title = original;
    };
  }, [enabled, openCount]);

  return {
    visible: enabled && openCount > 0,
    openCount,
    flash,
    requestNotifyPermission: () => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    },
  };
}
