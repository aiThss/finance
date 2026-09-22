import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
await Promise.all(
  [192, 512].map((size) =>
    sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`),
  ),
);
await sharp("public/icon.svg")
  .resize(360, 360)
  .extend({ top: 76, bottom: 76, left: 76, right: 76, background: "#171b19" })
  .png()
  .toFile("public/icon-maskable.png");

for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  for (const name of ["ic_launcher", "ic_launcher_round"])
    await sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`${dir}/${name}.png`);
  const extent = Math.round(size * 2.25),
    inner = Math.round(extent * 0.65),
    side = Math.floor((extent - inner) / 2);
  await sharp("public/icon.svg")
    .resize(inner, inner)
    .extend({
      top: side,
      left: side,
      right: extent - inner - side,
      bottom: extent - inner - side,
      background: { r: 23, g: 27, b: 25, alpha: 0 },
    })
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
}
const res = "android/app/src/main/res";
for (const dir of await readdir(res, { withFileTypes: true })) {
  if (!dir.isDirectory() || !dir.name.startsWith("drawable")) continue;
  const path = `${res}/${dir.name}/splash.png`;
  try {
    const { width, height } = await sharp(path).metadata();
    const logo = await sharp("public/icon.svg")
      .resize(Math.round(Math.min(width, height) * 0.24))
      .png()
      .toBuffer();
    const output = await sharp({
      create: { width, height, channels: 4, background: "#111513" },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toBuffer();
    await (await import("node:fs/promises")).writeFile(path, output);
  } catch (error) {
    if (!String(error).includes("Input file is missing")) throw error;
  }
}
