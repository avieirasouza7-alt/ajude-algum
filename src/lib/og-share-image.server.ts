import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ogShareJpeg from "../assets/og-share.jpg?arrayBuffer";

let cached: ArrayBuffer | null = null;

function readFromFilesystem(): ArrayBuffer | null {
  try {
    const metaUrl = import.meta.url;
    if (typeof metaUrl !== "string" || metaUrl.length === 0) return null;
    const assetPath = path.resolve(path.dirname(fileURLToPath(metaUrl)), "og-share.jpg");
    const bytes = readFileSync(assetPath);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    return null;
  }
}

export function getOgShareImageBytes(): ArrayBuffer {
  if (!cached) {
    cached = readFromFilesystem() ?? ogShareJpeg;
  }
  if (!cached) {
    throw new Error("Imagem de compartilhamento OG não encontrada.");
  }
  return cached;
}
