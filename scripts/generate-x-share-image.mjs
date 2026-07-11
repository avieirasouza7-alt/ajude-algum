import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/hero-5.jpg");
const output = path.join(root, "public/share-x.jpg");

await mkdir(path.dirname(output), { recursive: true });

await sharp(source)
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "left" })
  .modulate({ brightness: 1.02, saturation: 1.05 })
  .jpeg({ quality: 93, mozjpeg: true })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`Generated ${output} (${meta.width}x${meta.height}, ${meta.size} bytes)`);
