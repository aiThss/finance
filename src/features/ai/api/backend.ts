import { Capacitor } from "@capacitor/core";
import { normalizeApiBase } from "../../../lib/api-base";
export const backendBase = () =>
  normalizeApiBase(
    import.meta.env.VITE_API_BASE_URL,
    Capacitor.isNativePlatform(),
  );
export async function checkBackend() {
  const response = await fetch(`${backendBase()}/api/health`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Backend không khả dụng.");
  const body = await response.json();
  if (body.ok !== true || typeof body.aiConfigured !== "boolean")
    throw new Error("Phản hồi backend không hợp lệ.");
  return body as { ok: true; aiConfigured: boolean };
}
