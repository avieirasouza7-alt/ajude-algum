import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { MAX_CAMPAIGN_PHOTOS } from "@/lib/campaign-images";
import { createPhotoDraft, type PhotoDraft } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type CampaignImagePickerProps = {
  value: PhotoDraft[];
  onChange: (items: PhotoDraft[]) => void;
  disabled?: boolean;
};

export function CampaignImagePicker({ value, onChange, disabled }: CampaignImagePickerProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = MAX_CAMPAIGN_PHOTOS - value.length;

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files?.length || disabled) return;
    const list = Array.from(files);
    if (list.length > remaining) {
      toast.error(
        remaining === 0
          ? `Você já adicionou ${MAX_CAMPAIGN_PHOTOS} fotos. Remova uma para trocar.`
          : `Só cabem mais ${remaining} foto(s). Você selecionou ${list.length}.`,
      );
    }
    const toAdd = list.slice(0, remaining);
    if (!toAdd.length) return;

    setBusy(true);
    try {
      const drafts: PhotoDraft[] = [];
      for (const file of toAdd) {
        drafts.push(await createPhotoDraft(file));
      }
      onChange([...value, ...drafts]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    } finally {
      setBusy(false);
      if (addInputRef.current) addInputRef.current.value = "";
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const removeItem = (id: string) => {
    const item = value.find((x) => x.id === id);
    if (item?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    onChange(value.filter((x) => x.id !== id));
  };

  const replaceItem = async (id: string, file: File | null) => {
    if (!file || disabled) return;
    setBusy(true);
    try {
      const draft = await createPhotoDraft(file);
      onChange(value.map((item) => (item.id === id ? draft : item)));
      const old = value.find((x) => x.id === id);
      if (old?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(old.previewUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    } finally {
      setBusy(false);
      setReplaceId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Fotos da campanha <span className="text-destructive">*</span>
        </p>
        <Badge variant="outline" className="font-normal">
          {value.length} de {MAX_CAMPAIGN_PHOTOS} fotos
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Até {MAX_CAMPAIGN_PHOTOS} fotos (JPG, JPEG, PNG ou WebP). A primeira é a principal. As
        imagens são otimizadas automaticamente.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {value.map((item, index) => (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-xl border border-border bg-muted/30"
          >
            <img
              src={item.previewUrl}
              alt={index === 0 ? "Foto principal" : `Foto ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            {index === 0 && (
              <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">
                <Star className="mr-1 h-3 w-3" /> Principal
              </Badge>
            )}
            <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 flex-1 text-xs"
                disabled={disabled || busy}
                onClick={() => {
                  setReplaceId(item.id);
                  replaceInputRef.current?.click();
                }}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Trocar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-8 px-2"
                disabled={disabled || busy || value.length <= 1}
                onClick={() => removeItem(item.id)}
                aria-label="Remover foto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-3 text-center text-xs text-muted-foreground transition hover:border-primary hover:bg-primary/5">
            {busy ? (
              <span>Processando...</span>
            ) : value.length === 0 ? (
              <>
                <Upload className="h-6 w-6" />
                <span>Clique para enviar a foto principal</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span>Adicionar foto</span>
              </>
            )}
            <input
              ref={addInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple={remaining > 1}
              className="hidden"
              disabled={disabled || busy}
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          if (replaceId) replaceItem(replaceId, e.target.files?.[0] ?? null);
        }}
      />
    </div>
  );
}
