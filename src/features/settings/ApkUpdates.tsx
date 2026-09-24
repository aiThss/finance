import { useState, useRef } from "react";
import { RefreshCw, Download, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { version } from "../../../package.json";
import {
  checkApkUpdate,
  releasesUrl,
  downloadApk,
  triggerApkInstall,
} from "../../lib/apk-updates";
import { PixelWavyProgress } from "../../components/ui/PixelWavyProgress";

export function ApkUpdates() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [update, setUpdate] = useState<Awaited<
    ReturnType<typeof checkApkUpdate>
  > | null>(null);

  // Trạng thái modal tải trực tiếp với thanh con giun
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  async function startDirectDownload() {
    if (!update?.url) return;
    setModalOpen(true);
    setDownloading(true);
    setPercent(0);
    setDownloadError("");
    setDownloadBlob(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await downloadApk(
        update.url,
        (pct, loaded, total) => {
          setPercent(pct);
          setLoadedBytes(loaded);
          setTotalBytes(total);
        },
        controller.signal,
      );
      setDownloadBlob(blob);
      setDownloading(false);
      triggerApkInstall(blob, `tui-nho-v${update.version}.apk`);
    } catch (err) {
      if (controller.signal.aborted) {
        setDownloadError("Đã dừng tải bản cài đặt.");
      } else {
        setDownloadError(
          err instanceof Error ? err.message : "Lỗi khi tải gói cài đặt.",
        );
      }
      setDownloading(false);
    }
  }

  function handleCancelDownload() {
    abortControllerRef.current?.abort();
    setDownloading(false);
    setModalOpen(false);
  }

  function formatMB(bytes: number) {
    return (bytes / (1024 * 1024)).toFixed(1);
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
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            className="primary"
            onClick={() => void startDirectDownload()}
          >
            <Sparkles size={16} /> Tải trực tiếp trong ứng dụng
          </button>
          <p style={{ margin: 0 }}>
            <a href={update.url} target="_blank" rel="noopener noreferrer">
              <Download size={16} /> Tải APK {update.version}
            </a>
          </p>
        </div>
      )}

      <p className="muted">
        Tải APK rồi mở tệp để Android xác nhận cập nhật. Giữ ứng dụng đang có để
        bảo toàn dữ liệu.
      </p>
      <a href={releasesUrl} target="_blank" rel="noopener noreferrer">
        Mở trang phát hành
      </a>

      {/* Modal tải con giun */}
      {modalOpen && (
        <div className="pixel-download-modal-backdrop" role="presentation">
          <div className="pixel-download-modal" role="dialog" aria-modal="true">
            <div className="pixel-modal-header">
              <div className="pixel-modal-icon-glow">
                <Download size={24} />
              </div>
              <h2>
                {downloadBlob
                  ? "Tải bản cập nhật hoàn tất"
                  : `Đang tải Túi Nhỏ v${update?.version}`}
              </h2>
              <p className="pixel-modal-subtitle">
                {downloadBlob
                  ? "Mở tệp APK đã tải để Android tiến hành cài đè giữ nguyên dữ liệu."
                  : downloading
                    ? "Đang tải gói cài đặt từ GitHub Releases…"
                    : downloadError || "Chuẩn bị tải gói cài đặt…"}
              </p>
            </div>

            <div className="pixel-progress-section">
              <PixelWavyProgress percent={percent} height={28} />
              <div className="pixel-progress-meta">
                <span>{percent}%</span>
                <span>
                  {totalBytes > 0
                    ? `${formatMB(loadedBytes)} / ${formatMB(totalBytes)} MB`
                    : "Đang kết nối…"}
                </span>
              </div>
            </div>

            {downloadError && (
              <div className="pixel-download-error">
                <AlertCircle size={16} />
                <span>{downloadError}</span>
              </div>
            )}

            <div className="pixel-modal-actions">
              {downloadBlob ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      triggerApkInstall(downloadBlob, `tui-nho-v${update?.version}.apk`)
                    }
                  >
                    <CheckCircle2 size={18} />
                    Mở tệp cài đặt
                  </button>
                  <button type="button" onClick={() => setModalOpen(false)}>
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  {downloading ? (
                    <button type="button" onClick={handleCancelDownload}>
                      Hủy tải
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => void startDirectDownload()}
                    >
                      Thử lại
                    </button>
                  )}
                  <button type="button" onClick={handleCancelDownload}>
                    Để sau
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
