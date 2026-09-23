import { loadEnv } from "vite";
const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const base = env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
if (!base) {
  console.log(
    "No backend configured: Android uses the user's local Gemini key; offline finance remains available.",
  );
  process.exit(0);
}
const url = new URL(base);
if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw new Error(
    "VITE_API_BASE_URL must be an HTTPS backend URL without credentials, query or fragment.",
  );
const response = await fetch(`${base}/api/health`, {
  headers: { Origin: "https://localhost" },
  signal: AbortSignal.timeout(15000),
  redirect: "error",
});
if (!response.ok)
  throw new Error(`Backend /api/health failed: HTTP ${response.status}`);
if (response.headers.get("access-control-allow-origin") !== "https://localhost")
  throw new Error(
    "Backend must allow the Capacitor origin https://localhost in ALLOWED_ORIGINS.",
  );
const body = await response.json();
if (body.ok !== true || body.aiConfigured !== true)
  throw new Error(
    "Backend /api/health must confirm ok and aiConfigured before Android release.",
  );
console.log(
  "Android backend HTTPS, health, Gemini configuration and Capacitor CORS verified.",
);
