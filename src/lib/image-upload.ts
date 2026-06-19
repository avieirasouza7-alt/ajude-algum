import { supabase } from "@/integrations/supabase/client";
import { MAX_CAMPAIGN_PHOTOS } from "@/lib/campaign-images";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

export type PhotoDraft = {
  id: string;
  previewUrl: string;
  file?: File;
  storagePath?: string;
};

export function validateImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(file.type) || !ALLOWED_EXT.has(ext)) {
    return "Use apenas imagens JPG, JPEG, PNG ou WebP.";
  }
  if (file.size > MAX_INPUT_BYTES) {
    return "A imagem é muito grande. Escolha um arquivo de até 15 MB.";
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível otimizar a imagem."))),
      type,
      quality,
    );
  });
}

/** Redimensiona e comprime a imagem; converte para WebP quando o navegador suporta. */
export async function optimizeCampaignImage(file: File): Promise<File> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height, 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");

  ctx.drawImage(img, 0, 0, width, height);

  let blob: Blob;
  let mime = "image/webp";
  try {
    blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  } catch {
    mime = "image/jpeg";
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  }

  const ext = mime === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${crypto.randomUUID()}.${ext}`, { type: mime });
}

export async function createPhotoDraft(file: File): Promise<PhotoDraft> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  const optimized = await optimizeCampaignImage(file);
  return {
    id: crypto.randomUUID(),
    previewUrl: URL.createObjectURL(optimized),
    file: optimized,
  };
}

export function revokePhotoDraftPreviews(items: PhotoDraft[]) {
  for (const item of items) {
    if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
  }
}

export async function resolvePhotoStoragePaths(
  userId: string,
  items: PhotoDraft[],
  removedPaths: string[] = [],
): Promise<string[]> {
  if (items.length === 0) throw new Error("Envie pelo menos uma foto.");
  if (items.length > MAX_CAMPAIGN_PHOTOS) {
    throw new Error(`Você pode enviar no máximo ${MAX_CAMPAIGN_PHOTOS} fotos.`);
  }

  const uniqueRemoved = [...new Set(removedPaths.filter(Boolean))];
  if (uniqueRemoved.length) {
    await supabase.storage.from("campaign-images").remove(uniqueRemoved);
  }

  const paths: string[] = [];
  for (const item of items) {
    if (item.file) {
      const ext = item.file.name.split(".").pop() || "webp";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("campaign-images").upload(path, item.file, {
        contentType: item.file.type,
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
      continue;
    }
    if (item.storagePath) paths.push(item.storagePath);
  }

  return paths;
}
