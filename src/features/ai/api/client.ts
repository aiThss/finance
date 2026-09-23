import { backendBase } from "./backend";
import { aiDraftSchema } from "../schemas/draft";
import { hasLocalKey, isNative } from "./local-key";
import { requestDirect } from "./direct";
export async function requestAI(
  kind: "parse-transaction" | "receipt" | "insights",
  payload: unknown,
  signal: AbortSignal,
) {
  if (!navigator.onLine)
    throw new Error(
      "Bạn đang ngoại tuyến. Nhập giao dịch thủ công vẫn hoạt động.",
    );
  if (isNative() || (await hasLocalKey()))
    return requestDirect(kind, payload, signal);
  const base = backendBase();
  const token = sessionStorage.getItem("ai-access-token");
  const timeout = AbortSignal.timeout(30000);
  let response: Response;
  try {
    response = await fetch(`${base}/api/ai/${kind}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch {
    if (signal.aborted) throw new Error("Đã hủy yêu cầu.");
    if (timeout.aborted)
      throw new Error("AI phản hồi quá lâu. Vui lòng thử lại.");
    throw new Error(
      "Không kết nối được backend AI. Kiểm tra mạng hoặc thử lại sau; ghi thu chi thủ công vẫn hoạt động.",
    );
  }
  const body = await response
    .json()
    .catch(() => ({ error: "Backend trả về dữ liệu không hợp lệ." }));
  if (!response.ok)
    throw new Error(body.error ?? "AI tạm thời không khả dụng.");
  return kind === "insights"
    ? String(body.text ?? "")
    : aiDraftSchema.parse(body.draft);
}
