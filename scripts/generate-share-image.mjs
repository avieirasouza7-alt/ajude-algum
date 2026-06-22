import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/hero-1.jpg");
const output = path.join(root, "public/share.jpg");
const assetCopy = path.join(root, "src/assets/og-share.jpg");

await mkdir(path.dirname(output), { recursive: true });

// 1200×630 — formato Facebook/WhatsApp; foco nas mãos unidas (attention)
await sharp(source)
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .modulate({ brightness: 1.03, saturation: 1.08 })
  .sharpen({ sigma: 0.6 })
  .jpeg({ quality: 90, progressive: false, mozjpeg: true })
  .toFile(output);

await sharp(output).jpeg({ quality: 90 }).toFile(assetCopy);

const meta = await sharp(output).metadata();
console.log(`Generated ${output} (${meta.width}x${meta.height}, ${meta.size} bytes)`);
