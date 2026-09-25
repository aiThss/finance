// scripts/generate-icons.mjs
// Generate all icon assets from scripts/assets/app-icon.jpg using sharp.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const src = join(__dir, "assets", "app-icon.jpg");
const srcBuf = readFileSync(src);

const RES = "android/app/src/main/res";
const BG = "#051218";

function ensureDir(filePath) {
  const dir = join(root, filePath.split("/").slice(0, -1).join("/"));
  mkdirSync(dir, { recursive: true });
}

async function writePng(size, relPath, opts = {}) {
  const { padPct = 0, bg = BG } = opts;
  const pad = Math.round(size * padPct);
  const inner = size - pad * 2;
  ensureDir(relPath);
  let img = sharp(srcBuf).resize(inner, inner, { fit: "contain" });
  if (pad > 0) {
    img = img.extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: bg,
    });
  }
  await img.png().toFile(join(root, relPath));
  console.log("  ok " + relPath);
}

async function writeRoundPng(size, relPath) {
  ensureDir(relPath);
  const radius = Math.floor(size / 2);
  const circleSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
  );
  await sharp(srcBuf)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circleSvg, blend: "dest-in" }])
    .png()
    .toFile(join(root, relPath));
  console.log("  ok " + relPath + " (round)");
}

async function writeFavicon(relPath) {
  const pngBuf = await sharp(srcBuf)
    .resize(32, 32, { fit: "contain" })
    .png()
    .toBuffer();
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

// Adaptive foreground: logo centred in transparent canvas, safe-zone ~68% of 108dp
async function writeAdaptiveFg(size, relPath) {
  const logoSize = Math.round(size * 0.68);
  const pad = Math.round((size - logoSize) / 2);
  const imgInner = sharp(srcBuf).resize(logoSize, logoSize, { fit: "contain" });
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

console.log("Generating Tui Nho icons...\n");

// Ensure any old raster anydpi file is deleted
rmSync(join(root, RES, "mipmap-anydpi-v26/ic_launcher_foreground.png"), { force: true });

await Promise.all([
  // PWA icons
  writePng(192, "public/icon-192.png"),
  writePng(512, "public/icon-512.png"),
  writePng(512, "public/icon-maskable.png", { padPct: 0.1 }),
  writePng(180, "public/apple-touch-icon.png"),

  // Favicon
  writeFavicon("public/favicon.ico"),

  // Android legacy mipmap PNGs
  writePng(48, RES + "/mipmap-mdpi/ic_launcher.png"),
  writeRoundPng(48, RES + "/mipmap-mdpi/ic_launcher_round.png"),
  writePng(72, RES + "/mipmap-hdpi/ic_launcher.png"),
  writeRoundPng(72, RES + "/mipmap-hdpi/ic_launcher_round.png"),
  writePng(96, RES + "/mipmap-xhdpi/ic_launcher.png"),
  writeRoundPng(96, RES + "/mipmap-xhdpi/ic_launcher_round.png"),
  writePng(144, RES + "/mipmap-xxhdpi/ic_launcher.png"),
  writeRoundPng(144, RES + "/mipmap-xxhdpi/ic_launcher_round.png"),
  writePng(192, RES + "/mipmap-xxxhdpi/ic_launcher.png"),
  writeRoundPng(192, RES + "/mipmap-xxxhdpi/ic_launcher_round.png"),

  // Adaptive foreground (exact pixel density dimensions)
  ...Object.entries({ mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }).map(
    ([density, size]) =>
      writeAdaptiveFg(size, `${RES}/mipmap-${density}/ic_launcher_foreground.png`)
  ),
]);

// Generate embedded SVG for public/icon.svg
const b64 = (await sharp(srcBuf).resize(512, 512).png().toBuffer()).toString("base64");
writeFileSync(
  join(root, "public", "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${b64}"/></svg>\n`
);
console.log("  ok public/icon.svg");

// Android splash screens
const resFull = join(root, RES);
for (const dirName of readdirSync(resFull)) {
  if (!dirName.startsWith("drawable")) continue;
  const splashPath = join(resFull, dirName, "splash.png");
  if (!existsSync(splashPath)) continue;
  const meta = await sharp(splashPath).metadata();
  const logoSize = Math.round(Math.min(meta.width, meta.height) * 0.35);
  const logoBuf = await sharp(srcBuf).resize(logoSize, logoSize, { fit: "contain" }).png().toBuffer();
  await sharp({
    create: { width: meta.width, height: meta.height, channels: 4, background: BG },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(splashPath);
  console.log("  ok " + dirName + "/splash.png");
}

console.log("\nDone. All icons regenerated from app-icon.jpg");
