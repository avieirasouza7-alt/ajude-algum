import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/hero-5.jpg");
const fallback = path.join(root, "src/assets/hero-volunteer.jpg");
const output = path.join(root, "public/share-como-criar.jpg");

await mkdir(path.dirname(output), { recursive: true });

const { access } = await import("node:fs/promises");
let input = source;
try {
  await access(source);
} catch {
  input = fallback;
}

// 1200×630 — criança com lanterna (mesma imagem que o usuário preferiu)
await sharp(input)
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "left" })
  .modulate({ brightness: 1.02, saturation: 1.05 })
  .jpeg({ quality: 94, progressive: false, mozjpeg: true })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`Generated ${output} (${meta.width}x${meta.height})`);
