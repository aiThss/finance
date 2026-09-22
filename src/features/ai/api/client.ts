import { aiDraftSchema } from "../schemas/draft";
export async function requestAI(
  kind: "parse-transaction" | "receipt" | "insights",
  payload: unknown,
  signal: AbortSignal,
) {
  if (!navigator.onLine)
    throw new Error(
      "Bạn đang ngoại tuyến. Nhập giao dịch thủ công vẫn hoạt động.",
    );
  const token = sessionStorage.getItem("ai-access-token");
  const timeout = AbortSignal.timeout(30000);
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/ai/${kind}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([signal, timeout]),
      },
    );
  } catch (e) {
    if (signal.aborted) throw new Error("Đã hủy yêu cầu.");
    if (timeout.aborted)
      throw new Error("AI phản hồi quá lâu. Vui lòng thử lại.");
    throw e;
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
