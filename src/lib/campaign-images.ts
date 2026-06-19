import { getCampaignImageUrl } from "@/lib/storage";
import type { PhotoDraft } from "@/lib/image-upload";

export const MAX_CAMPAIGN_PHOTOS = 3;

export type CampaignImageSource = {
  image_paths?: string[] | null;
  image_path?: string | null;
};

export function getCampaignImagePaths(campaign: CampaignImageSource): string[] {
  if (campaign.image_paths?.length) {
    return campaign.image_paths.filter((path): path is string => Boolean(path));
  }
  if (campaign.image_path) return [campaign.image_path];
  return [];
}

export function getPrimaryImagePath(campaign: CampaignImageSource): string | null {
  return getCampaignImagePaths(campaign)[0] ?? null;
}

export async function photoDraftsFromStoragePaths(paths: string[]): Promise<PhotoDraft[]> {
  const drafts: PhotoDraft[] = [];
  for (const storagePath of paths) {
    const previewUrl = (await getCampaignImageUrl(storagePath)) ?? "";
    drafts.push({
      id: crypto.randomUUID(),
      previewUrl,
      storagePath,
    });
  }
  return drafts;
}

export function getRemovedStoragePaths(initial: string[], items: PhotoDraft[]): string[] {
  const kept = new Set(items.map((item) => item.storagePath).filter(Boolean));
  return initial.filter((path) => !kept.has(path));
}
