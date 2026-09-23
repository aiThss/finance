import { useEffect, useState } from "react";
import { KeyRound, Trash2, CheckCircle2 } from "lucide-react";
import {
  hasLocalKey,
  isNative,
  saveLocalKey,
  removeLocalKey,
  localGemini,
} from "../ai/api/local-key";
export function GeminiKeySettings() {
  const [key, setKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    void hasLocalKey()
      .then(setConfigured)
      .catch(() => setStatus("Không đọc được key. Xóa key rồi nhập lại."));
  }, []);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try {
      await run();
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Không thực hiện được. Hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="muted">
        Dùng API key riêng để gửi yêu cầu trực tiếp đến Google. Chỉ nội dung bạn
        xác nhận mới được gửi; AI không tự sửa giao dịch.
      </p>
      <label>
        Gemini API key
        <input
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={
            configured
              ? "Đã có key · nhập để thay thế"
              : "Dán key từ Google AI Studio"
          }
        />
      </label>
      <small>
        {isNative()
          ? "Key được mã hóa bằng Android Keystore trên máy này, không đưa vào bản sao lưu."
          : "Key chỉ giữ trong bộ nhớ tab này. Tải lại trang sẽ cần nhập lại."}
      </small>
      <div className="button-stack">
        <button
          disabled={busy || !key.trim()}
          onClick={() =>
            void action(async () => {
              await saveLocalKey(key);
              setKey("");
              setConfigured(true);
              setStatus("Đã lưu key. Bạn có thể kiểm tra kết nối.");
            })
          }
        >
          <KeyRound size={18} />
          Lưu API key
        </button>
        <button
          disabled={busy || !configured}
          onClick={() =>
            void action(async () => {
              await localGemini(null, new AbortController().signal, true);
              setStatus(
                "Key hợp lệ, đã kết nối Google Gemini. Hạn mức phụ thuộc tài khoản của bạn.",
              );
            })
          }
        >
          <CheckCircle2 size={18} />
          Kiểm tra key Gemini
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void action(async () => {
              await removeLocalKey();
              setConfigured(false);
              setKey("");
              setStatus(
                "Đã xóa key khỏi ứng dụng. Bạn vẫn có thể ghi thu chi thủ công.",
              );
            })
          }
        >
          <Trash2 size={18} />
          Xóa API key
        </button>
      </div>
      {status && <p role="status">{status}</p>}
      <details>
        <summary>Cách lấy API key</summary>
        <ol>
          <li>
            Mở{" "}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>{" "}
            và đăng nhập Google.
          </li>
          <li>Chọn Create API key, chọn hoặc tạo project, rồi sao chép key.</li>
          <li>Dán vào ô trên, bấm Lưu API key rồi Kiểm tra key Gemini.</li>
        </ol>
        <p className="muted">
          Giữ key riêng tư; không gửi qua chat hoặc chụp ảnh chia sẻ. Theo dõi
          quota/chi phí trong AI Studio. Nếu lộ key, xóa key ở AI Studio và tạo
          key mới. Nội dung gửi AI được Google xử lý theo chính sách tài khoản
          của bạn.
        </p>
      </details>
    </>
  );
}
