import { useState } from "react";
import { RefreshCw, Download, Sparkles, ExternalLink } from "lucide-react";
import { version } from "../../../package.json";
import {
  checkApkUpdate,
  releasesUrl,
  openApkDownload,
} from "../../lib/apk-updates";

export function ApkUpdates() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [update, setUpdate] = useState<Awaited<
    ReturnType<typeof checkApkUpdate>
  > | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  function handleStartDownload() {
    if (!update?.url) return;
    setDownloadStarted(true);
    openApkDownload(update.url);
  }

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
          setDownloadStarted(false);
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
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary"
              onClick={handleStartDownload}
            >
              <Sparkles size={16} />{" "}
              {downloadStarted ? "Tải lại APK" : "Tải bản cập nhật"}
            </button>
            <a
              href={update.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                textDecoration: "none",
              }}
            >
              <Download size={16} /> Tải APK {update.version}
            </a>
          </div>
          {downloadStarted && (
            <p className="muted" style={{ margin: 0, color: "var(--accent)" }}>
              ✓ Đã mở tiến trình tải. Vui lòng kiểm tra thanh thông báo Android để cài đặt khi tải xong.
            </p>
          )}
        </div>
      )}

      <p className="muted">
        Tải APK rồi mở tệp để Android xác nhận cập nhật. Giữ ứng dụng đang có để
        bảo toàn dữ liệu.
      </p>
      <a href={releasesUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink
          size={14}
          style={{ verticalAlign: "middle", marginRight: 4 }}
        />
        Mở trang phát hành
      </a>
    </section>
  );
}
