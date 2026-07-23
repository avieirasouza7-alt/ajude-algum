import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  REPORT_TYPES,
  extractCampaignSlug,
  reportTypeLabel,
  type ReportType,
} from "@/lib/report-types";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { buildDefaultOgMeta, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";
import { logAccessEvent } from "@/lib/access-log";

const formSchema = z.object({
  report_type: z.enum(["campanha", "fraude", "conteudo", "dados", "plataforma", "outro"]),
  campaign_reference: z.string().trim().max(500),
  reason: z.string().trim().min(10, "Descreva com pelo menos 10 caracteres").max(1000),
});

export const Route = createFileRoute("/denuncias")({
  validateSearch: (search: Record<string, unknown>): { campanha?: string } => {
    const campanha = typeof search.campanha === "string" ? search.campanha : "";
    return campanha ? { campanha } : {};
  },
  head: () => ({
    meta: [
      { title: `Canal de Denúncias — ${SITE_NAME}` },
      {
        name: "description",
        content:
          "Denuncie campanhas suspeitas, fraudes, conteúdo indevido ou problemas na plataforma Ajude Alguém Online.",
      },
      ...buildDefaultOgMeta({
        title: `Canal de Denúncias — ${SITE_NAME}`,
        description:
          "Denuncie campanhas suspeitas, fraudes, conteúdo indevido ou problemas na plataforma Ajude Alguém Online.",
        path: "/denuncias",
        includeImage: false,
      }),
    ],
    links: [canonicalHeadLink("/denuncias")],
  }),
  component: Denuncias,
});

async function resolveCampaignId(reference: string) {
  const slug = extractCampaignSlug(reference);
  if (!slug) return null;
  const { data } = await supabase.from("campaigns").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

function Denuncias() {
  const { campanha } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reportType, setReportType] = useState<ReportType>("campanha");
  const [campaignRef, setCampaignRef] = useState(campanha ?? "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (campanha) setCampaignRef(campanha);
  }, [campanha]);

  const { data: myReports } = useQuery({
    queryKey: ["my-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Tables<"reports">[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("login");
      const parsed = formSchema.safeParse({
        report_type: reportType,
        campaign_reference: campaignRef,
        reason,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      let campaignId: string | null = null;
      if (parsed.data.campaign_reference) {
        campaignId = await resolveCampaignId(parsed.data.campaign_reference);
      }

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        report_type: parsed.data.report_type,
        campaign_id: campaignId,
        campaign_reference: parsed.data.campaign_reference || null,
        reason: parsed.data.reason,
      });
      if (error) throw error;
      void logAccessEvent("report.create", {
        entityType: campaignId ? "campaign" : "report",
        entityId: campaignId ?? undefined,
        details: { report_type: parsed.data.report_type },
      });
    },
    onSuccess: () => {
      setReason("");
      if (!campanha) setCampaignRef("");
      qc.invalidateQueries({ queryKey: ["my-reports", user?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("Denúncia enviada. Analisamos em até 48 horas úteis (fraude tem prioridade).");
    },
    onError: (err: Error) => {
      if (err.message === "login") {
        toast.error("Entre na sua conta para enviar uma denúncia.");
        return;
      }
      toast.error(err.message);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Canal de Denúncias</h1>
            <p className="mt-2 text-muted-foreground">
              Use este canal para reportar campanhas suspeitas, fraudes, conteúdo inadequado ou
              problemas na plataforma. Analisamos cada denúncia com responsabilidade.{" "}
              <strong>
                Meta de análise: até 48 horas úteis
              </strong>{" "}
              após o envio (casos de fraude têm prioridade). Se a denúncia for procedente, a campanha
              pode ser ocultada ou removida.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: AlertTriangle,
              title: "O que denunciar",
              text: "Informações falsas, golpes, conteúdo ofensivo ou uso indevido de dados.",
            },
            {
              icon: Clock,
              title: "Prazo de análise",
              text: "Recebemos sua denúncia e a equipe de moderação avalia o caso.",
            },
            {
              icon: CheckCircle2,
              title: "Sigilo",
              text: "Seu relato fica registrado na sua conta para acompanhamento.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-2 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {!user ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              Para enviar uma denúncia, é necessário estar logado. Assim conseguimos registrar e
              acompanhar seu relato com segurança.
            </p>
            <Button asChild className="mt-4 gradient-warm text-primary-foreground">
              <Link to="/auth">Entrar ou criar conta</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
            className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div>
              <Label htmlFor="report_type">Tipo de denúncia *</Label>
              <Select
                value={reportType}
                onValueChange={(value) => setReportType(value as ReportType)}
              >
                <SelectTrigger id="report_type" className="mt-1">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="campaign_reference">Campanha relacionada (opcional)</Label>
              <Input
                id="campaign_reference"
                value={campaignRef}
                onChange={(e) => setCampaignRef(e.target.value)}
                placeholder="Cole o link ou o identificador da campanha"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ex.: link da campanha ou texto após /campanha/ na URL.
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Descrição detalhada *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique o que aconteceu, por que acredita ser irregular e, se possível, inclua detalhes que ajudem na análise..."
                minLength={10}
                maxLength={1000}
                rows={6}
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={submit.isPending}
              className="w-full gradient-warm text-primary-foreground"
            >
              {submit.isPending ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </form>
        )}

        {user && myReports && myReports.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Suas denúncias recentes</h2>
            <ul className="mt-4 space-y-3">
              {myReports.map((report) => (
                <li
                  key={report.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{reportTypeLabel(report.report_type)}</Badge>
                    <Badge
                      className={
                        report.resolved
                          ? "bg-success text-success-foreground"
                          : "bg-warning/15 text-warning"
                      }
                    >
                      {report.resolved ? "Resolvida" : "Em análise"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  {report.campaign_reference && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Referência: {report.campaign_reference}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-foreground/90">{report.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
