import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat();
}
const secret = process.env.GEMINI_API_KEY;
for (const file of await files("dist")) {
  if (!/\.(?:html|css|js|json|webmanifest)$/.test(file)) continue;
  const text = await readFile(file, "utf8");
  if (
    /VITE_GEMINI_API_KEY|AIza[\w-]{30,}|generativelanguage\.googleapis\.com/.test(
      text,
    ) ||
    (secret && text.includes(secret))
  )
    throw new Error(
      `Unexpected credential or direct Gemini API reference in ${file}`,
    );
}
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const key of Object.keys(lock.packages))
  if (
    /node_modules\/(?:three|@react-three\/fiber|@react-three\/drei|gsap|matter-js)$/.test(
      key,
    )
  )
    throw new Error(`Forbidden decorative dependency: ${key}`);
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
if (manifest.display !== "standalone" || manifest.icons.length < 3)
  throw new Error("Incomplete PWA manifest");
console.info(
  "Frontend credential scan, dependency constraints and PWA manifest verified.",
);
