import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useOpenReportsAlert } from "@/hooks/use-open-reports-alert";
import { cn } from "@/lib/utils";

/**
 * Faixa vermelha no topo — só admin — quando há denúncia aberta.
 * Prioridade máxima de atenção.
 */
export function UrgentDenunciaBanner() {
  const { visible, openCount, flash, requestNotifyPermission } = useOpenReportsAlert();

  useEffect(() => {
    if (visible) requestNotifyPermission();
  }, [visible, requestNotifyPermission]);

  if (!visible) return null;

  const label =
    openCount === 1
      ? "URGENTE — DENÚNCIA ABERTA"
      : `URGENTE — ${openCount} DENÚNCIAS ABERTAS`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "border-b-2 border-red-900 bg-red-600 text-white shadow-lg",
        flash && "animate-pulse",
      )}
    >
      <Link
        to="/admin/denuncias"
        className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-3 py-2.5 text-center sm:gap-3 sm:px-6 sm:py-3"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" aria-hidden />
        <span className="text-sm font-black uppercase tracking-wide sm:text-base">
          {label}
        </span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-red-100 sm:inline">
          · Clique para analisar agora
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}
