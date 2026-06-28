import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, "..");
const sourceSvg = join(mobileRoot, "..", "public", "favicon.svg");
const resDir = join(mobileRoot, "android", "app", "src", "main", "res");

const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

for (const [folder, size] of Object.entries(sizes)) {
  const dir = join(resDir, folder);
  mkdirSync(dir, { recursive: true });
  const png = await sharp(sourceSvg).resize(size, size).png().toBuffer();
  writeFileSync(join(dir, "ic_launcher.png"), png);
  writeFileSync(join(dir, "ic_launcher_round.png"), png);
  writeFileSync(join(dir, "ic_launcher_foreground.png"), png);
}

console.log("Ícones Android gerados.");
