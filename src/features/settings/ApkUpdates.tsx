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
  const [downloadBusy, setDownloadBusy] = useState(false);

  async function handleStartDownload() {
    if (!update?.url || downloadBusy) return;
    setDownloadBusy(true);
    setDownloadStarted(false);
    setStatus("Đang bắt đầu tải APK…");
    try {
      await openApkDownload(update.url);
      setDownloadStarted(true);
      setStatus("Đã gửi yêu cầu tải APK.");
    } catch {
      setStatus("Chưa bắt đầu tải được APK. Vui lòng thử lại.");
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <section className="settings-section">
      <h2>Cập nhật APK</h2>
      <p className="muted">
        Phiên bản hiện tại: {version}. Kiểm tra bản Android mới trên GitHub.
      </p>
      <button
        disabled={busy || downloadBusy}
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
              disabled={downloadBusy}
            >
              <Sparkles size={16} />{" "}
              {downloadBusy
                ? "Đang bắt đầu tải…"
                : downloadStarted
                  ? "Tải lại APK"
                  : "Tải bản cập nhật"}
            </button>
            <button
              type="button"
              onClick={handleStartDownload}
              disabled={downloadBusy}
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
            </button>
          </div>
          {downloadStarted && (
            <p className="muted" style={{ margin: 0, color: "var(--accent)" }}>
              ✓ Đã gửi yêu cầu tải. Kiểm tra thông báo tải xuống để mở APK khi
              tải xong.
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
