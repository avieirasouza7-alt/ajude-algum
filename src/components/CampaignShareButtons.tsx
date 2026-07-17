import { Copy, Facebook, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildCampaignShareMessage,
  campaignShareUrl,
  copyCampaignShare,
  shareOnFacebook,
  shareOnInstagram,
  shareOnWhatsApp,
} from "@/lib/share-campaign";
import { trackShare } from "@/lib/site-analytics";
import { toast } from "sonner";

type CampaignShareButtonsProps = {
  title: string;
  /** Preferir sempre o slug para link canônico limpo. */
  campaignSlug: string;
  url?: string;
};

export function CampaignShareButtons({ title, url, campaignSlug }: CampaignShareButtonsProps) {
  const shareUrl = (() => {
    try {
      return campaignShareUrl(campaignSlug);
    } catch {
      return url?.trim() || "";
    }
  })();
  const message = buildCampaignShareMessage(title, shareUrl);

  const handleWhatsApp = () => {
    if (!shareUrl) {
      toast.error("Link da campanha indisponível.");
      return;
    }
    trackShare("whatsapp", campaignSlug);
    shareOnWhatsApp(message);
  };

  const handleFacebook = () => {
    if (!campaignSlug?.trim()) {
      toast.error("Link inválido para o Facebook. Use Copiar link.");
      return;
    }
    trackShare("facebook", campaignSlug);
    try {
      shareOnFacebook(campaignShareUrl(campaignSlug));
    } catch {
      void (async () => {
        const target = shareUrl || campaignShareUrl(campaignSlug);
        const ok = await copyCampaignShare(target, title);
        if (ok === "copied") {
          toast.message("Link copiado. Cole na sua publicação do Facebook.", {
            description: target,
          });
          window.open("https://www.facebook.com/", "_blank", "noopener,noreferrer");
          return;
        }
        toast.error("Não foi possível abrir o Facebook. Copie o link manualmente.");
      })();
    }
  };

  const handleInstagram = async () => {
    trackShare("instagram", campaignSlug);
    const result = await shareOnInstagram(shareUrl, title);
    if (result === "shared") {
      toast.success("Compartilhado!");
      return;
    }
    if (result === "copied") {
      toast.success("Link copiado! Cole no Instagram (Stories, Direct ou bio).");
      return;
    }
    if (result === "cancelled") return;
    toast.error("Não foi possível compartilhar. Use o botão Copiar link.");
  };

  const handleCopy = async () => {
    const result = await copyCampaignShare(shareUrl, title);
    if (result === "copied") {
      toast.success("Link copiado! Cole onde quiser.");
      return;
    }
    toast.error("Não foi possível copiar. Selecione o link na barra do navegador.");
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Compartilhar campanha
      </p>
      <Button
        type="button"
        onClick={handleWhatsApp}
        variant="outline"
        className="w-full border-success/40 text-success hover:bg-success/10 hover:text-success"
      >
        <Share2 className="mr-1.5 h-4 w-4" /> WhatsApp
      </Button>
      <Button
        type="button"
        onClick={handleFacebook}
        variant="outline"
        className="w-full border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/10 hover:text-[#1877F2]"
      >
        <Facebook className="mr-1.5 h-4 w-4" /> Facebook
      </Button>
      <Button
        type="button"
        onClick={handleInstagram}
        variant="outline"
        className="w-full border-[#E4405F]/40 text-[#E4405F] hover:bg-[#E4405F]/10 hover:text-[#E4405F]"
      >
        <Instagram className="mr-1.5 h-4 w-4" /> Instagram
      </Button>
      <Button type="button" onClick={handleCopy} variant="outline" className="w-full">
        <Copy className="mr-1.5 h-4 w-4" /> Copiar link
      </Button>
    </div>
  );
}
