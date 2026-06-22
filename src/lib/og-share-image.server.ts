import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const assetPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "og-share.jpg");

let cached: Buffer | null = null;

export function getOgShareImageBytes() {
  if (!cached) cached = readFileSync(assetPath);
  return cached;
}
