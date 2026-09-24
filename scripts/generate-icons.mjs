// scripts/generate-icons.mjs
// Generate all icon assets from public/icon.svg using sharp.
//
// Usage: node scripts/generate-icons.mjs
//
// Outputs:
//   public/icon-192.png
//   public/icon-512.png
//   public/icon-maskable.png   (PWA maskable with 10% safe-zone padding)
//   public/apple-touch-icon.png
//   public/favicon.ico          (real ICO, PNG-in-ICO format)
//   android mipmaps: mdpi(48) hdpi(72) xhdpi(96) xxhdpi(144) xxxhdpi(192)
//   android adaptive foreground: anydpi-v26 and xxhdpi variants
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const src = join(root, "public", "icon.svg");
const svgBuf = readFileSync(src);

const RES = "android/app/src/main/res";

function ensureDir(filePath) {
  const dir = join(root, filePath.split("/").slice(0, -1).join("/"));
  mkdirSync(dir, { recursive: true });
}

async function writePng(inputBuf, size, relPath, opts = {}) {
  const { padPct = 0, bg = { r: 23, g: 27, b: 25, alpha: 1 }, transparent = false } = opts;
  const finalBg = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : bg;
  const pad = Math.round(size * padPct);
  const inner = size - pad * 2;
  ensureDir(relPath);
  let img = sharp(inputBuf, { density: 300 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (pad > 0) {
    img = img.extend({
      top: pad, bottom: pad, left: pad, right: pad,
      background: finalBg,
    });
  }
  await img.png().toFile(join(root, relPath));
  console.log("  ok " + relPath);
}

async function writeFavicon(inputBuf, relPath) {
  const pngBuf = await sharp(inputBuf, { density: 300 })
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  // ICO: ICONDIR (6) + ICONDIRENTRY (16) + PNG data
  const ico = Buffer.alloc(22 + pngBuf.length);
  ico.writeUInt16LE(0, 0);              // reserved
  ico.writeUInt16LE(1, 2);              // type ICO
  ico.writeUInt16LE(1, 4);              // image count
  ico.writeUInt8(32, 6);               // width
  ico.writeUInt8(32, 7);               // height
  ico.writeUInt8(0, 8);                // color count
  ico.writeUInt8(0, 9);                // reserved
  ico.writeUInt16LE(1, 10);            // planes
  ico.writeUInt16LE(32, 12);           // bit count
  ico.writeUInt32LE(pngBuf.length, 14);// data size
  ico.writeUInt32LE(22, 18);           // data offset
  pngBuf.copy(ico, 22);
  ensureDir(relPath);
  writeFileSync(join(root, relPath), ico);
  console.log("  ok " + relPath + " (ICO)");
}

console.log("Generating Tui Nho icons...\n");

// Adaptive foreground: logo centred in transparent canvas, safe-zone ~66% of 108
async function writeAdaptiveFg(inputBuf, size, relPath) {
  const logoSize = Math.round(size * 0.62);
  const pad = Math.round((size - logoSize) / 2);
  const imgInner = sharp(inputBuf, { density: 300 })
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  ensureDir(relPath);
  await imgInner
    .extend({
      top: pad,
      bottom: size - logoSize - pad,
      left: pad,
      right: size - logoSize - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(root, relPath));
  console.log("  ok " + relPath + " (adaptive fg)");
}

await Promise.all([
  // PWA icons
  writePng(svgBuf, 192,  "public/icon-192.png"),
  writePng(svgBuf, 512,  "public/icon-512.png"),
  writePng(svgBuf, 512,  "public/icon-maskable.png",    { padPct: 0.1 }),
  writePng(svgBuf, 180,  "public/apple-touch-icon.png"),

  // Android legacy mipmap PNGs
  writePng(svgBuf,  48, RES + "/mipmap-mdpi/ic_launcher.png"),
  writePng(svgBuf,  48, RES + "/mipmap-mdpi/ic_launcher_round.png"),
  writePng(svgBuf,  72, RES + "/mipmap-hdpi/ic_launcher.png"),
  writePng(svgBuf,  72, RES + "/mipmap-hdpi/ic_launcher_round.png"),
  writePng(svgBuf,  96, RES + "/mipmap-xhdpi/ic_launcher.png"),
  writePng(svgBuf,  96, RES + "/mipmap-xhdpi/ic_launcher_round.png"),
  writePng(svgBuf, 144, RES + "/mipmap-xxhdpi/ic_launcher.png"),
  writePng(svgBuf, 144, RES + "/mipmap-xxhdpi/ic_launcher_round.png"),
  writePng(svgBuf, 192, RES + "/mipmap-xxxhdpi/ic_launcher.png"),
  writePng(svgBuf, 192, RES + "/mipmap-xxxhdpi/ic_launcher_round.png"),

  // Adaptive foreground
  writeAdaptiveFg(svgBuf, 108, RES + "/mipmap-anydpi-v26/ic_launcher_foreground.png"),
  writeAdaptiveFg(svgBuf, 144, RES + "/mipmap-xxhdpi/ic_launcher_foreground.png"),

  // Favicon
  writeFavicon(svgBuf, "public/favicon.ico"),
]);

console.log("\nDone. All icons regenerated from public/icon.svg");
