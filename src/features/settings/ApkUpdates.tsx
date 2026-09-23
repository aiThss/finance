import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import { version } from "../../../package.json";
import { checkApkUpdate, releasesUrl } from "../../lib/apk-updates";
export function ApkUpdates() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [update, setUpdate] = useState<Awaited<
    ReturnType<typeof checkApkUpdate>
  > | null>(null);
  return (
    <section className="settings-section">
      <h2>Cập nhật APK</h2>
      <p className="muted">
        Phiên bản hiện tại: {version}. Kiểm tra bản Android mới trên GitHub.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setUpdate(null);
          setStatus("Đang kiểm tra bản mới…");
          try {
            const result = await checkApkUpdate(version);
            setUpdate(result);
            setStatus(
              result.available
                ? `Có phiên bản ${result.version} để tải.`
                : "Bạn đang dùng phiên bản mới nhất.",
            );
          } catch (error) {
            setStatus(
              error instanceof Error &&
                error.name !== "TypeError" &&
                error.name !== "TimeoutError"
                ? error.message
                : "Không kết nối được GitHub. Kiểm tra mạng và thử lại.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <RefreshCw size={18} />
        {busy ? "Đang kiểm tra…" : "Kiểm tra cập nhật APK"}
      </button>
      {status && <p role="status">{status}</p>}
      {update?.available && (
        <p>
          <a href={update.url} target="_blank" rel="noopener noreferrer">
            <Download size={16} /> Tải APK {update.version}
          </a>
        </p>
      )}
      <p className="muted">
        Tải APK rồi mở tệp để Android xác nhận cập nhật. Giữ ứng dụng đang có để
        bảo toàn dữ liệu.
      </p>
      <a href={releasesUrl} target="_blank" rel="noopener noreferrer">
        Mở trang phát hành
      </a>
    </section>
  );
}
