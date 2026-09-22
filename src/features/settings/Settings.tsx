import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useApp } from "../../app/context";
import { settingsRepository } from "../../db/repositories";
import {
  exportBackup,
  exportCSV,
  restoreBackup,
  validateBackup,
} from "../../db/backup";
import type { Backup } from "../../domain/schema";
import { downloadFile } from "../../lib/files";
import { ErrorText, message, PageTitle } from "../../components/ui/Common";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
export default function Settings() {
  const { data, notify } = useApp();
  const [error, setError] = useState("");
  const [backup, setBackup] = useState<Backup | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState("");
  const [token, setToken] = useState(
    () => sessionStorage.getItem("ai-access-token") ?? "",
  );
  const file = useRef<HTMLInputElement>(null);
  const s = data.settings;
  async function patch(value: Partial<typeof s>) {
    try {
      await settingsRepository.save({ ...s, ...value });
    } catch (e) {
      setError(message(e));
    }
  }
  async function exportData(csv = false) {
    setBusy(true);
    try {
      if (
        !confirm(
          "Bản sao chứa thông tin tài chính riêng tư, chưa mã hóa. Chỉ lưu ở nơi bạn tin cậy. Tiếp tục?",
        )
      )
        return;
      const content = csv
        ? await exportCSV()
        : JSON.stringify(await exportBackup(), null, 2);
      await downloadFile(
        `tui-nho-${new Date().toISOString().slice(0, 10)}.${csv ? "csv" : "json"}`,
        content,
        csv ? "text/csv;charset=utf-8" : "application/json",
      );
      notify("Đã tạo bản xuất dữ liệu");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Cài đặt" description="Túi Nhỏ, theo cách của bạn." />
      <section className="settings-section">
        <h2>Hiển thị</h2>
        <label>
          Giao diện
          <select
            value={s.theme}
            onChange={(e) =>
              void patch({ theme: e.target.value as typeof s.theme })
            }
          >
            <option value="dark">Tối</option>
            <option value="light">Sáng</option>
            <option value="system">Theo thiết bị</option>
          </select>
        </label>
        <div className="form-grid">
          <label>
            Tiền tệ
            <select value="VND" disabled>
              <option>VND</option>
            </select>
          </label>
          <label>
            Ngôn ngữ
            <select value="vi" disabled>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
        </div>
        <label>
          Ngày đầu tuần
          <select
            value={s.firstDay}
            onChange={(e) =>
              void patch({ firstDay: e.target.value as typeof s.firstDay })
            }
          >
            <option value="monday">Thứ Hai</option>
            <option value="sunday">Chủ nhật</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>
            Ẩn số tiền<small>Che số dư và số tiền trên các màn hình.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={s.privacy}
            onChange={(e) => void patch({ privacy: e.target.checked })}
          />
        </label>
      </section>
      <section className="settings-section">
        <h2>Dữ liệu của bạn</h2>
        <p className="muted">
          Lưu trên thiết bị và trình duyệt hiện tại. Không tự đồng bộ lên máy
          chủ. Xuất bản sao thường xuyên và trước khi đổi thiết bị hoặc xóa dữ
          liệu trình duyệt.
        </p>
        <div className="button-stack">
          <button disabled={busy} onClick={() => void exportData()}>
            <Download size={18} />
            Sao lưu JSON
          </button>
          <button disabled={busy} onClick={() => void exportData(true)}>
            <Download size={18} />
            Xuất giao dịch CSV
          </button>
          <button disabled={busy} onClick={() => file.current?.click()}>
            <Upload size={18} />
            Khôi phục từ JSON
          </button>
        </div>
        <input
          hidden
          ref={file}
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              if (f.size > 30 * 1024 * 1024)
                throw new Error("Bản sao quá lớn (tối đa 30 MB).");
              setBackup(validateBackup(JSON.parse(await f.text())));
              setConfirmText("");
              setError("");
            } catch (e) {
              setError(`Không thể đọc bản sao: ${message(e)}`);
            }
          }}
        />
        <button
          className="text-button"
          onClick={async () => {
            try {
              const ok = await navigator.storage?.persist?.();
              notify(
                ok
                  ? "Đã cấp quyền lưu trữ bền vững"
                  : "Trình duyệt chưa cấp quyền. Hãy giữ bản sao lưu.",
              );
            } catch (e) {
              setError(message(e));
            }
          }}
        >
          <ShieldCheck size={17} />
          Yêu cầu lưu trữ bền vững
        </button>
      </section>
      <section className="settings-section">
        <h2>Trợ lý AI</h2>
        <label className="toggle-row">
          <span>
            Bật Gemini<small>AI là tùy chọn và cần kết nối internet.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={s.aiEnabled}
            onChange={(e) =>
              void patch({
                aiEnabled: e.target.checked,
                aiConsent: e.target.checked ? s.aiConsent : false,
              })
            }
          />
        </label>
        <p className="muted">
          Chỉ nội dung bạn gửi, ảnh bạn chọn hoặc số liệu tổng hợp cần thiết mới
          được gửi đến Google qua backend. AI tạo gợi ý, không tự sửa giao dịch.
          Tắt AI không ảnh hưởng quản lý thu chi.
        </p>
        <label>
          Mã truy cập AI (nếu quản trị viên đã đặt)
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              sessionStorage.setItem("ai-access-token", e.target.value);
            }}
          />
        </label>
        <small>
          Mã chỉ giữ trong phiên hiện tại. Không nhập Gemini API key vào đây.
        </small>
        <button
          onClick={async () => {
            setConnection("Đang kiểm tra…");
            try {
              const res = await fetch(
                `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/health`,
                { signal: AbortSignal.timeout(8000) },
              );
              if (!res.ok) throw new Error();
              const body = await res.json();
              setConnection(
                body.aiConfigured
                  ? "Backend sẵn sàng; đã cấu hình Gemini."
                  : "Backend sẵn sàng; chưa cấu hình Gemini API key.",
              );
            } catch {
              setConnection(
                "Không kết nối được backend. Kiểm tra mạng hoặc URL API.",
              );
            }
          }}
        >
          <CheckCircle2 size={17} />
          Kiểm tra kết nối backend
        </button>
        {connection && <p role="status">{connection}</p>}
      </section>
      <section className="settings-section">
        <h2>Giao dịch định kỳ</h2>
        <p>
          Luôn chờ bạn xác nhận từng kỳ. Không tự sinh giao dịch quá hạn, không
          tự thanh toán.
        </p>
      </section>
      <section className="settings-section">
        <h2>
          Túi Nhỏ <span className="muted">1.0.0</span>
        </h2>
        <p>Một chút ghi chép, nhẹ lòng mỗi ngày.</p>
        <p className="muted">
          Không quảng cáo. Không theo dõi. Bản web, PWA và Android dùng chung
          một ứng dụng.
        </p>
        {import.meta.env.DEV && (
          <button
            onClick={async () => {
              try {
                const { seedDemo } = await import("../../db/demo");
                await seedDemo();
                notify("Đã tạo dữ liệu minh họa");
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            Tạo dữ liệu demo (chỉ khi chưa có tài khoản)
          </button>
        )}
      </section>
      <ErrorText error={error} />
      {backup && (
        <Sheet title="Xác nhận khôi phục" onClose={() => setBackup(null)}>
          <p className="notice">
            Thao tác này thay thế toàn bộ dữ liệu hiện tại, không gộp. Hãy xuất
            bản sao trước khi tiếp tục.
          </p>
          <p>
            {backup.accounts.length} tài khoản · {backup.transactions.length}{" "}
            giao dịch · {backup.categories.length} danh mục ·{" "}
            {backup.budgets.length} ngân sách · {backup.recurring.length} lịch
            định kỳ
          </p>
          <label>
            Nhập THAY THẾ để xác nhận
            <input
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </label>
          <ErrorText error={error} />
          <footer className="sheet-footer">
            <button
              className="primary"
              disabled={confirmText !== "THAY THẾ" || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await restoreBackup(backup);
                  dismissSheet();
                  notify("Đã khôi phục dữ liệu");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Thay thế và khôi phục
            </button>
          </footer>
        </Sheet>
      )}
    </>
  );
}
