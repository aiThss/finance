import { useTransactionsForRange, useBudgets } from "../../db/queries";
import { useEffect, useRef, useState } from "react";
import { Sparkles, ImagePlus, Send, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { subMonths, addMonths, startOfMonth } from "date-fns";
import { useApp } from "../../app/context";
import {
  PageTitle,
  ErrorText,
  message,
  Money,
} from "../../components/ui/Common";
import { requestAI } from "./api/client";
import type { AiDraft } from "./schemas/draft";
import { settingsRepository } from "../../db/repositories";
import {
  breakdown,
  budgetStatus,
  monthKey,
  reportService,
} from "../../domain/money";
export default function AI() {
  const { data: baseData, openTransaction } = useApp();
  const [mode, setMode] = useState<"entry" | "insights">("entry");
  const transactions = useTransactionsForRange(
    startOfMonth(subMonths(new Date(), 1)).toISOString(),
    startOfMonth(addMonths(new Date(), 1)).toISOString(),
    mode === "insights",
  );
  const budgets = useBudgets(mode === "insights");
  const data = {
    ...baseData,
    transactions: transactions ?? [],
    budgets: budgets ?? [],
  };
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [consent, setConsent] = useState(data.settings.aiConsent);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const month = monthKey(new Date());
  const current = reportService.getMonthlySummary(data.transactions, month);
  const previous = reportService.getMonthlySummary(
    data.transactions,
    monthKey(subMonths(new Date(), 1)),
  );
  const compact = {
    month,
    current,
    previous,
    categories: breakdown(
      data.transactions.filter((t) => monthKey(t.occurredAt) === month),
      "categoryId",
    ).map((c) => ({
      name: data.categories.find((x) => x.id === c.key)?.name ?? "Khác",
      amount: c.amount,
    })),
    budgets: data.budgets
      .filter((b) => b.enabled && b.startMonth <= month)
      .map((b) => {
        const s = budgetStatus(b, data.transactions, month);
        return { name: b.name, spent: s.spent, remaining: s.remaining };
      }),
  };
  async function send() {
    setError("");
    setBusy(true);
    setDraft(null);
    setAnswer("");
    controller.current = new AbortController();
    try {
      if (!consent)
        throw new Error("Vui lòng đọc và đồng ý trước khi gửi dữ liệu.");
      if (!data.settings.aiConsent)
        await settingsRepository.save({ ...data.settings, aiConsent: true });
      const context = {
        now: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        accounts: data.accounts
          .filter((a) => !a.archived)
          .map((a) => a.name)
          .slice(0, 100),
        categories: data.categories
          .filter((c) => !c.archived)
          .map((c) => c.name)
          .slice(0, 100),
      };
      let result;
      if (mode === "insights")
        result = await requestAI(
          "insights",
          { question: text, summary: compact },
          controller.current.signal,
        );
      else if (image) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("Không đọc được ảnh"));
          reader.readAsDataURL(image);
        });
        result = await requestAI(
          "receipt",
          { image: base64, mimeType: image.type, context },
          controller.current.signal,
        );
      } else
        result = await requestAI(
          "parse-transaction",
          { text, context },
          controller.current.signal,
        );
      if (typeof result === "string") setAnswer(result);
      else setDraft(result);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Một người phụ ghi"
        description="Bạn quyết định. Gemini giúp một tay."
      />
      <div className="ai-intro">
        <Sparkles size={30} strokeWidth={1.4} />
        <h2>
          Nói tự nhiên.
          <br />
          Ghi chép gọn hơn.
        </h2>
        <p>“Trưa nay ăn phở 55k trả MoMo”</p>
      </div>
      {!data.settings.aiEnabled ? (
        <div className="notice">
          <ShieldCheck />
          <p>
            AI đang tắt. <Link to="/settings">Bật trong Cài đặt</Link> khi bạn
            muốn dùng.
          </p>
        </div>
      ) : (
        <>
          <div className="segmented">
            <button
              className={mode === "entry" ? "selected" : ""}
              onClick={() => {
                setMode("entry");
                setDraft(null);
                setAnswer("");
              }}
            >
              Nhập giao dịch
            </button>
            <button
              className={mode === "insights" ? "selected" : ""}
              onClick={() => {
                setMode("insights");
                setDraft(null);
                setAnswer("");
              }}
            >
              Hiểu chi tiêu
            </button>
          </div>
          <label>
            {mode === "entry"
              ? "Bạn vừa thu hay chi khoản gì?"
              : "Bạn muốn hiểu điều gì?"}
            <textarea
              rows={4}
              maxLength={mode === "entry" ? 2000 : 1000}
              value={text}
              placeholder={
                mode === "entry"
                  ? "Trưa nay ăn phở 55k trả MoMo"
                  : "Tháng này tôi tiêu nhiều nhất vào đâu?"
              }
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          {mode === "entry" && (
            <>
              <label className="file-picker">
                <ImagePlus size={20} />
                {image ? image.name : "Chọn ảnh hóa đơn / ảnh giao dịch"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 4 * 1024 * 1024) {
                      setError("Ảnh tối đa 4 MB.");
                      e.target.value = "";
                      return;
                    }
                    setImage(f ?? null);
                    setError("");
                  }}
                />
              </label>
              {preview && (
                <div className="receipt-preview">
                  <img src={preview} alt="Ảnh hóa đơn đã chọn, chưa gửi" />
                  <button onClick={() => setImage(null)}>Bỏ ảnh</button>
                  <small>Ảnh chỉ được gửi khi bạn bấm nút bên dưới.</small>
                </div>
              )}
            </>
          )}
          {mode === "insights" && (
            <details>
              <summary>Số liệu sẽ gửi cho AI</summary>
              <p>
                Tháng {month}: thu <Money value={current.income} />, chi{" "}
                <Money value={current.expense} />. Kèm tổng tháng trước, chi
                tiêu từng danh mục và ngân sách còn lại. Không gửi lịch sử giao
                dịch, UUID hay số tài khoản.
              </p>
            </details>
          )}
          {!data.settings.aiConsent && (
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Tôi đồng ý gửi nội dung/ảnh đã chọn, tên tài khoản và danh mục
                cần thiết, hoặc số liệu tổng hợp cho Google Gemini. Không gửi
                toàn bộ dữ liệu. Tôi sẽ kiểm tra gợi ý trước khi lưu.
              </span>
            </label>
          )}
          <ErrorText error={error} />
          <div className="button-stack">
            <button
              className="primary"
              disabled={
                busy ||
                (mode === "insights" && (!transactions || !budgets)) ||
                !consent ||
                (!text.trim() && !(mode === "entry" && image))
              }
              onClick={() => void send()}
            >
              <Send size={17} />
              {busy
                ? "Đang nhờ Gemini…"
                : mode === "entry"
                  ? "Gửi để tạo bản nháp"
                  : "Gửi câu hỏi và số liệu"}
            </button>
            {busy && (
              <button onClick={() => controller.current?.abort()}>
                Hủy yêu cầu
              </button>
            )}
          </div>
          {draft && (
            <section className="ai-result">
              <span className="status-chip">Bản nháp · chưa lưu</span>
              <h2>{draft.title}</h2>
              <Money value={draft.amountMinor} />
              <p>
                {draft.suggestedAccount ?? "Chưa rõ tài khoản"} ·{" "}
                {draft.suggestedCategory ?? "Chưa rõ danh mục"}
              </p>
              <p className="muted">
                Độ tin cậy {Math.round(draft.confidence * 100)}%. Kiểm tra số
                tiền, ngày và tài khoản.
              </p>
              <button
                className="primary"
                onClick={() => {
                  const normalize = (s: string) =>
                    s.trim().toLocaleLowerCase("vi");
                  openTransaction({
                    type: draft.type,
                    amountMinor: draft.amountMinor,
                    title: draft.title,
                    occurredAt: draft.occurredAt,
                    accountId: data.accounts.find(
                      (a) =>
                        !a.archived &&
                        normalize(a.name) ===
                          normalize(draft.suggestedAccount ?? ""),
                    )?.id,
                    categoryId: data.categories.find(
                      (c) =>
                        !c.archived &&
                        c.type === draft.type &&
                        normalize(c.name) ===
                          normalize(draft.suggestedCategory ?? ""),
                    )?.id,
                  });
                }}
              >
                Kiểm tra & chỉnh sửa trước khi lưu
              </button>
            </section>
          )}
          {answer && (
            <section className="ai-result">
              <h2>Góc nhìn từ Gemini</h2>
              <p className="ai-answer">{answer}</p>
              <small>
                Gợi ý AI có thể sai. Số liệu trong báo cáo là nguồn đối chiếu.
              </small>
            </section>
          )}
        </>
      )}
    </>
  );
}
