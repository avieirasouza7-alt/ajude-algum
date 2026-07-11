import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "social");
const desktopDir = path.join(process.env.USERPROFILE || "", "Desktop", "ajude-alguem-redes");

const favicon = path.join(root, "public", "favicon.svg");
const hero = path.join(root, "src", "assets", "hero-1.jpg");

await mkdir(outDir, { recursive: true });
await mkdir(desktopDir, { recursive: true });

const profilePath = path.join(outDir, "perfil.png");
const coverPath = path.join(outDir, "capa.jpg");
const coverWidePath = path.join(outDir, "capa-facebook.jpg");

await sharp(favicon).resize(512, 512).png().toFile(profilePath);

await sharp(hero)
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .modulate({ brightness: 1.03, saturation: 1.08 })
  .jpeg({ quality: 92 })
  .toFile(coverPath);

await sharp(hero)
  .rotate()
  .resize(1640, 624, { fit: "cover", position: "attention" })
  .modulate({ brightness: 1.03, saturation: 1.08 })
  .jpeg({ quality: 92 })
  .toFile(coverWidePath);

for (const file of ["perfil.png", "capa.jpg", "capa-facebook.jpg"]) {
  await copyFile(path.join(outDir, file), path.join(desktopDir, file));
}

console.log("Gerado em:", outDir);
console.log("Copiado para:", desktopDir);
