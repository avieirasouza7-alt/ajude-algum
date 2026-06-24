import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ogShareJpeg from "../assets/og-share.jpg?arrayBuffer";

let cached: Uint8Array | null = null;

function readFromFilesystem(): Uint8Array | null {
  try {
    const metaUrl = import.meta.url;
    if (typeof metaUrl !== "string" || metaUrl.length === 0) return null;
    const assetPath = path.resolve(path.dirname(fileURLToPath(metaUrl)), "og-share.jpg");
    return new Uint8Array(readFileSync(assetPath));
  } catch {
    return null;
  }
}

export function getOgShareImageBytes(): Uint8Array {
  if (!cached) {
    cached = readFromFilesystem() ?? new Uint8Array(ogShareJpeg);
  }
  return cached;
}
