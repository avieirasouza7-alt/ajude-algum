import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { logAdminAction } from "@/lib/admin";
import { ADSENSE_SETTINGS_DEFAULTS, type AdSenseSettings } from "@/lib/adsense";
import { toast } from "sonner";

type SiteConfig = {
  site_name: string;
  hero_title: string;
  hero_subtitle: string;
  contact_email: string;
  contact_phone: string;
  social_instagram: string;
  social_facebook: string;
  social_whatsapp: string;
  footer_text: string;
  terms_excerpt: string;
  privacy_excerpt: string;
};

const DEFAULTS: SiteConfig = {
  site_name: "Ajude Alguém",
  hero_title: "Juntos podemos transformar vidas.",
  hero_subtitle: "Crie ou apoie campanhas solidárias via PIX.",
  contact_email: "",
  contact_phone: "",
  social_instagram: "",
  social_facebook: "",
  social_whatsapp: "",
  footer_text: "Feito com 💚 para conectar pessoas.",
  terms_excerpt: "",
  privacy_excerpt: "",
};

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: AdminConfiguracoes,
});

function AdminConfiguracoes() {
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteConfig>(DEFAULTS);
  const [adsense, setAdsense] = useState<AdSenseSettings>(ADSENSE_SETTINGS_DEFAULTS);

  const { data } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle();
      return (row?.value as SiteConfig | undefined) ?? DEFAULTS;
    },
  });

  const { data: adsenseData } = useQuery({
    queryKey: ["admin", "site-settings", "adsense"],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "adsense")
        .maybeSingle();
      return (row?.value as AdSenseSettings | undefined) ?? ADSENSE_SETTINGS_DEFAULTS;
    },
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data });
  }, [data]);

  useEffect(() => {
    if (adsenseData) setAdsense({ ...ADSENSE_SETTINGS_DEFAULTS, ...adsenseData });
  }, [adsenseData]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("site_settings").upsert({
        key: "general",
        value: form,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      await logAdminAction({
        action: "settings.update",
        entityType: "site_settings",
        entityId: "general",
        details: form,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAdsense = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("site_settings").upsert({
        key: "adsense",
        value: adsense,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      await logAdminAction({
        action: "settings.adsense",
        entityType: "site_settings",
        entityId: "adsense",
        details: adsense,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings", "adsense"] });
      toast.success("Google AdSense configurado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: keyof SiteConfig, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setAd = (key: keyof AdSenseSettings, value: string | boolean) =>
    setAdsense((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Configurações</h1>
        <p className="text-muted-foreground">
          Altere informações do site sem editar código. Textos legais completos continuam nas páginas
          dedicadas; aqui você pode definir resumos ou avisos extras.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do site</Label>
              <Input value={form.site_name} onChange={(e) => set("site_name", e.target.value)} />
            </div>
            <div>
              <Label>Título do banner</Label>
              <Input value={form.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
            </div>
            <div>
              <Label>Subtítulo do banner</Label>
              <Textarea
                value={form.hero_subtitle}
                onChange={(e) => set("hero_subtitle", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Texto do rodapé</Label>
              <Input value={form.footer_text} onChange={(e) => set("footer_text", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato e redes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>E-mail de contato</Label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={form.social_instagram}
                onChange={(e) => set("social_instagram", e.target.value)}
              />
            </div>
            <div>
              <Label>Facebook</Label>
              <Input
                value={form.social_facebook}
                onChange={(e) => set("social_facebook", e.target.value)}
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={form.social_whatsapp}
                onChange={(e) => set("social_whatsapp", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Google AdSense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole os IDs do painel do Google AdSense. Anúncios aparecem só em páginas públicas
              (início, lista e página da campanha). Após publicar o site, confira também{" "}
              <code className="text-xs">/ads.txt</code> no seu domínio.
            </p>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox
                checked={adsense.enabled}
                onCheckedChange={(v) => setAd("enabled", v === true)}
              />
              Ativar anúncios no site
            </label>
            <div>
              <Label>ID do editor (ca-pub-...)</Label>
              <Input
                value={adsense.client_id}
                onChange={(e) => setAd("client_id", e.target.value)}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Bloco — página inicial</Label>
                <Input
                  value={adsense.slot_home}
                  onChange={(e) => setAd("slot_home", e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label>Bloco — lista de campanhas</Label>
                <Input
                  value={adsense.slot_list}
                  onChange={(e) => setAd("slot_list", e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label>Bloco — página da campanha</Label>
                <Input
                  value={adsense.slot_campaign}
                  onChange={(e) => setAd("slot_campaign", e.target.value)}
                  placeholder="1234567890"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveAdsense.mutate()}
              disabled={saveAdsense.isPending}
            >
              {saveAdsense.isPending ? "Salvando..." : "Salvar AdSense"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Textos legais (avisos extras)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label>Aviso Termos de Uso</Label>
              <Textarea
                value={form.terms_excerpt}
                onChange={(e) => set("terms_excerpt", e.target.value)}
                rows={4}
                placeholder="Texto curto exibido opcionalmente no rodapé ou auth..."
              />
            </div>
            <div>
              <Label>Aviso Política de Privacidade</Label>
              <Textarea
                value={form.privacy_excerpt}
                onChange={(e) => set("privacy_excerpt", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="gradient-warm text-primary-foreground"
      >
        {save.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
