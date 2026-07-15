import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { SignedImage } from "@/components/SignedImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CAMPAIGN_STATUS_LABELS, logAdminAction } from "@/lib/admin";
import { formatCampaignAdminSubtitle } from "@/lib/campaign-display";
import { brl, formatDate } from "@/lib/format";
import { formatViewCount } from "@/lib/campaign-views";
import { isValidPixKey, normalizePixKey, SITE_DONATION_PIX_KEY } from "@/lib/pix-donation";
import { Check, X, Archive, Star, Trash2, ExternalLink, Edit3, Eye, Wallet } from "lucide-react";
import { toast } from "sonner";

type Campaign = Tables<"campaigns">;

export const Route = createFileRoute("/_authenticated/admin/campanhas")({
  component: AdminCampanhas,
});

function AdminCampanhas() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Campaign | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pixTarget, setPixTarget] = useState<Campaign | null>(null);
  const [pixDraft, setPixDraft] = useState("");

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin", "campaigns", statusFilter],
    queryFn: async () => {
      let q = supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as Campaign["status"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const patch = useMutation({
    mutationFn: async ({
      id,
      update,
      action,
    }: {
      id: string;
      update: TablesUpdate<"campaigns">;
      action: string;
    }) => {
      const { error } = await supabase.from("campaigns").update(update).eq("id", id);
      if (error) throw error;
      await logAdminAction({
        action,
        entityType: "campaign",
        entityId: id,
        details: update as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Campanha atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction({ action: "campaign.delete", entityType: "campaign", entityId: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Campanha excluída.");
    },
  });

  const filtered = (campaigns ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.beneficiary_name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Moderação de campanhas</h1>
        <p className="text-muted-foreground">Aprove, rejeite, arquive ou destaque campanhas.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por título, beneficiário ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}

      <div className="space-y-4">
        {filtered.map((c) => (
          <article
            key={c.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
          >
            <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
              <SignedImage
                path={c.image_path}
                alt={c.title}
                className="aspect-[16/10] w-full rounded-xl object-cover"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{c.title}</h2>
                  <Badge variant="outline">{CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}</Badge>
                  {c.featured && (
                    <Badge className="bg-accent text-accent-foreground">★ Destaque</Badge>
                  )}
                  {c.hidden && <Badge variant="destructive">Oculta</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCampaignAdminSubtitle({ ...c, formatDate })}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-foreground/90">{c.story}</p>
                <p className="mt-2 text-sm">
                  Meta {brl(c.goal_amount)} •{" "}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViewCount(c.views ?? 0)} visualizações
                  </span>{" "}
                  • PIX: <code className="text-xs">{c.pix_key}</code>
                </p>
                {c.rejection_reason && (
                  <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
                    Motivo: {c.rejection_reason}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPixTarget(c);
                      setPixDraft(c.pix_key);
                    }}
                  >
                    <Wallet className="mr-1 h-3.5 w-3.5" /> Corrigir PIX
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/editar/$id" params={{ id: c.id }}>
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> Editar campanha
                    </Link>
                  </Button>
                  {c.status !== "approved" && (
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground"
                      onClick={() =>
                        patch.mutate({
                          id: c.id,
                          update: { status: "approved" },
                          action: "campaign.approve",
                        })
                      }
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                    </Button>
                  )}
                  {c.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setRejectTarget(c)}>
                      <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch.mutate({
                        id: c.id,
                        update: { status: "correction_requested" },
                        action: "campaign.request_correction",
                      })
                    }
                  >
                    <Edit3 className="mr-1 h-3.5 w-3.5" /> Solicitar correção
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch.mutate({
                        id: c.id,
                        update: { status: "archived" },
                        action: "campaign.archive",
                      })
                    }
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch.mutate({
                        id: c.id,
                        update: { featured: !c.featured },
                        action: "campaign.featured_toggle",
                      })
                    }
                  >
                    <Star className="mr-1 h-3.5 w-3.5" />{" "}
                    {c.featured ? "Remover destaque" : "Destacar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch.mutate({
                        id: c.id,
                        update: { hidden: !c.hidden },
                        action: "campaign.hidden_toggle",
                      })
                    }
                  >
                    {c.hidden ? "Exibir" : "Ocultar"}
                  </Button>
                  {c.status === "approved" && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/campanha/$slug" params={{ slug: c.slug }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Excluir campanha permanentemente?")) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-muted-foreground">Nenhuma campanha encontrada.</p>
        )}
      </div>

      <Dialog
        open={!!pixTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPixTarget(null);
            setPixDraft("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir chave PIX</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{pixTarget?.title}</p>
          <div className="space-y-2">
            <Input
              value={pixDraft}
              onChange={(e) => setPixDraft(e.target.value)}
              placeholder="E-mail, telefone, CPF ou chave aleatória"
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-primary"
              onClick={() => setPixDraft(SITE_DONATION_PIX_KEY)}
            >
              Usar PIX do site ({SITE_DONATION_PIX_KEY})
            </Button>
          </div>
          <DialogFooter>
            <Button
              className="gradient-warm text-primary-foreground"
              disabled={patch.isPending || pixDraft.trim().length < 4}
              onClick={() => {
                if (!pixTarget) return;
                const next = pixDraft.trim();
                if (!isValidPixKey(next)) {
                  toast.error(
                    "Chave PIX inválida. Use e-mail, telefone, CPF, CNPJ ou chave aleatória.",
                  );
                  return;
                }
                patch.mutate(
                  {
                    id: pixTarget.id,
                    update: { pix_key: normalizePixKey(next) },
                    action: "campaign.pix_key_update",
                  },
                  {
                    onSuccess: () => {
                      setPixTarget(null);
                      setPixDraft("");
                    },
                  },
                );
              }}
            >
              Salvar chave PIX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar campanha</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Informe o motivo da rejeição..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            minLength={5}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectTarget || rejectReason.trim().length < 5) {
                  toast.error("Informe o motivo (mín. 5 caracteres).");
                  return;
                }
                patch.mutate({
                  id: rejectTarget.id,
                  update: { status: "rejected", rejection_reason: rejectReason.trim() },
                  action: "campaign.reject",
                });
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
