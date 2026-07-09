import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/assets/hero-volunteer.jpg");
const output = path.join(root, "public/share.jpg");
const assetCopy = path.join(root, "src/assets/og-share.jpg");

await mkdir(path.dirname(output), { recursive: true });

const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#064e3b" stop-opacity="0.94"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#047857"/>
  <text x="600" y="400" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">Ajude Alguém Online</text>
  <text x="600" y="458" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#d1fae5">Vaquinhas solidárias via PIX</text>
  <text x="600" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#ecfdf5">Crie ou apoie campanhas. Sem taxas escondidas.</text>
  <rect x="300" y="548" width="600" height="52" rx="26" fill="#047857"/>
  <text x="600" y="582" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">ajudealguemonline.com.br</text>
</svg>`);

// 1200×630 — formato Facebook/WhatsApp
await sharp(source)
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .modulate({ brightness: 0.98, saturation: 1.1 })
  .composite([{ input: overlay, top: 0, left: 0 }])
  .jpeg({ quality: 92, progressive: false, mozjpeg: true })
  .toFile(output);

await sharp(output).jpeg({ quality: 92 }).toFile(assetCopy);

const meta = await sharp(output).metadata();
console.log(`Generated ${output} (${meta.width}x${meta.height}, ${meta.size} bytes)`);
