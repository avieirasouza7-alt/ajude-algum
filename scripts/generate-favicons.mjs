import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public/favicon.svg");
const publicDir = path.join(root, "public");

function pngDimensions(png) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function createIcoFromPngBuffers(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let dataOffset = 6 + count * 16;

  for (const png of pngBuffers) {
    const { width, height } = pngDimensions(png);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    entries.push(entry);
    dataOffset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function png(size, filename) {
  const output = path.join(publicDir, filename);
  await sharp(source).resize(size, size).png().toFile(output);
  return output;
}

const png16 = await sharp(source).resize(16, 16).png().toBuffer();
const png32 = await sharp(source).resize(32, 32).png().toBuffer();
const png48 = await sharp(source).resize(48, 48).png().toBuffer();

await writeFile(
  path.join(publicDir, "favicon.ico"),
  createIcoFromPngBuffers([png16, png32, png48]),
);
await png(16, "favicon-16x16.png");
await png(32, "favicon-32x32.png");
await sharp(source).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));

console.log("Generated favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png");
