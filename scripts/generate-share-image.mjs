import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/hero-1.jpg");
const output = path.join(root, "public/share.jpg");

await mkdir(path.dirname(output), { recursive: true });

await sharp(source)
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 86, progressive: false, mozjpeg: true })
  .toFile(output);

console.log(`Generated ${output} (1200x630)`);
