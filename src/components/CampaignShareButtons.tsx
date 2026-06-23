import { Facebook, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildCampaignShareMessage,
  shareOnFacebook,
  shareOnInstagram,
  shareOnWhatsApp,
} from "@/lib/share-campaign";
import { toast } from "sonner";

type CampaignShareButtonsProps = {
  title: string;
  url?: string;
};

export function CampaignShareButtons({ title, url }: CampaignShareButtonsProps) {
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const message = buildCampaignShareMessage(title, shareUrl);

  const handleInstagram = async () => {
    const result = await shareOnInstagram(shareUrl, title);
    if (result === "shared") {
      toast.success("Compartilhado!");
      return;
    }
    if (result === "copied") {
      toast.success("Link copiado! Cole no Instagram (Stories, Direct ou bio).");
      return;
    }
    toast.error("Não foi possível compartilhar. Copie o link da barra do navegador.");
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Compartilhar campanha
      </p>
      <Button
        type="button"
        onClick={() => shareOnWhatsApp(message)}
        variant="outline"
        className="w-full border-success/40 text-success hover:bg-success/10 hover:text-success"
      >
        <Share2 className="mr-1.5 h-4 w-4" /> WhatsApp
      </Button>
      <Button
        type="button"
        onClick={() => shareOnFacebook(shareUrl)}
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
    </div>
  );
}
