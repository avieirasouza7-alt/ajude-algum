import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logAdminAction } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/conteudo")({
  component: AdminConteudo,
});

function AdminConteudo() {
  const qc = useQueryClient();

  const { data: comments } = useQuery({
    queryKey: ["admin", "comments"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const userIds = [...new Set((rows ?? []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((c) => ({ ...c, author: map.get(c.user_id) ?? null }));
    },
  });

  const { data: hiddenCampaigns } = useQuery({
    queryKey: ["admin", "hidden-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, slug, hidden, status")
        .eq("hidden", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (comment: Tables<"comments">) => {
      const { error } = await supabase.from("comments").delete().eq("id", comment.id);
      if (error) throw error;
      await logAdminAction({
        action: "comment.delete",
        entityType: "comment",
        entityId: comment.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "comments"] });
      toast.success("Comentário removido.");
    },
  });

  const unhide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").update({ hidden: false }).eq("id", id);
      if (error) throw error;
      await logAdminAction({ action: "campaign.unhide", entityType: "campaign", entityId: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Campanha visível novamente.");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Moderação de conteúdo</h1>
        <p className="text-muted-foreground">Comentários e campanhas ocultas.</p>
      </div>

      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTrigger value="comments">Comentários ({comments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="hidden">Ocultas ({hiddenCampaigns?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="mt-4 space-y-3">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.author?.full_name ?? "Anônimo"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => deleteComment.mutate(c)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                </Button>
              </div>
              <p className="mt-2 text-sm">{c.content}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="hidden" className="mt-4 space-y-3">
          {(hiddenCampaigns ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{c.title}</p>
                <Badge variant="outline" className="mt-1">
                  {c.status}
                </Badge>
              </div>
              <Button size="sm" onClick={() => unhide.mutate(c.id)}>
                Tornar visível
              </Button>
            </div>
          ))}
          {!hiddenCampaigns?.length && (
            <p className="text-muted-foreground">Nenhuma campanha oculta.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
