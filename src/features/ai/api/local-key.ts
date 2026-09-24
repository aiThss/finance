import { Capacitor, registerPlugin } from "@capacitor/core";
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
const native = registerPlugin<{
  status(): Promise<{ configured: boolean }>;
  save(options: { key: string }): Promise<void>;
  remove(): Promise<void>;
  request(options: {
    body?: string;
    check?: boolean;
  }): Promise<{ status: number; body: string }>;
}>("LocalGemini");
// Web keys exist only in memory. They are deliberately absent from localStorage,
// IndexedDB, service-worker caches, exports and request URLs.
let webKey = "";
export const isNative = () => Capacitor.isNativePlatform();
export async function hasLocalKey() {
  return isNative() ? (await native.status()).configured : !!webKey;
}
export async function saveLocalKey(value: string) {
  const key = value.trim();
  // Keys are opaque credentials; auth keys can contain dots and exceed 256 characters.
  if (!/^[\x21-\x7E]{20,4096}$/.test(key))
    throw new Error(
      "Key bị thiếu hoặc chứa khoảng trắng/ký tự không hỗ trợ. Sao chép toàn bộ key từ Google AI Studio.",
    );
  if (isNative()) await native.save({ key });
  else webKey = key;
}
export async function removeLocalKey() {
  if (isNative()) await native.remove();
  else webKey = "";
}
export function geminiError(status: number) {
  return new Error(
    status === 401
      ? "Google không xác thực được key. Kiểm tra hoặc tạo auth key mới trong Google AI Studio."
      : status === 403
        ? "Google từ chối quyền truy cập. Kiểm tra quyền và giới hạn của key/project trong Google AI Studio."
        : status === 400
          ? "Google từ chối yêu cầu (400). Kiểm tra auth key và cấu hình project trong Google AI Studio; yêu cầu hoặc model cũng có thể không tương thích."
          : status === 404
            ? "Model Gemini hiện không khả dụng cho yêu cầu này. Kiểm tra model hoặc cập nhật ứng dụng."
            : status === 429
              ? "Đã hết hạn mức Gemini. Kiểm tra quota hoặc thử lại sau."
              : "Gemini tạm thời không khả dụng. Hãy thử lại hoặc nhập thủ công.",
  );
}
export async function localGemini(
  body: unknown,
  signal: AbortSignal,
  check = false,
): Promise<unknown> {
  signal.throwIfAborted();
  if (!navigator.onLine)
    throw new Error("Bạn đang ngoại tuyến. Kết nối mạng rồi thử lại.");
  if (isNative()) {
    const response = await native.request({
      ...(check ? { check: true } : { body: JSON.stringify(body) }),
    });
    signal.throwIfAborted();
    if (response.status < 200 || response.status >= 300)
      throw geminiError(response.status);
    return JSON.parse(response.body);
  }
  if (!webKey)
    throw new Error("Nhập Gemini API key của bạn trong Cài đặt trước.");
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${check ? `models/${GEMINI_MODEL}` : "interactions"}`,
      {
        method: check ? "GET" : "POST",
        headers: {
          "x-goog-api-key": webKey,
          ...(!check ? { "Content-Type": "application/json" } : {}),
        },
        ...(!check ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
      },
    );
  } catch {
    throw new Error(
      signal.aborted
        ? "Đã hủy yêu cầu."
        : "Không kết nối được Gemini. Kiểm tra mạng hoặc thử lại sau.",
    );
  }
  if (!response.ok) throw geminiError(response.status);
  return response.json();
}
