import { watchApkUpdates } from "../lib/watch-apk-updates";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Download, CheckCircle2, AlertCircle, X } from "lucide-react";
import { version } from "../../package.json";
import {
  checkApkUpdate,
  downloadApk,
  triggerApkInstall,
} from "../lib/apk-updates";
import { PixelWavyProgress } from "../components/ui/PixelWavyProgress";

export default function ApkAutoUpdateManager({
  sheetOpen,
}: {
  sheetOpen: boolean;
}) {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Trạng thái modal tải
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const offeredVersion = useRef<string | null>(null);
  useEffect(
    () =>
      watchApkUpdates(
        () => checkApkUpdate(version),
        (result) => {
          if (result.available) {
            if (offeredVersion.current !== result.version)
              setBannerDismissed(false);
            offeredVersion.current = result.version;
            setNewVersion(result.version);
            setDownloadUrl(result.url);
          } else {
            offeredVersion.current = null;
            setNewVersion(null);
            setDownloadUrl(null);
          }
        },
        true,
      ),
    [],
  );

  async function startDownload() {
    if (!downloadUrl) return;
    setModalOpen(true);
    setDownloading(true);
    setPercent(0);
    setDownloadError("");
    setDownloadBlob(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await downloadApk(
        downloadUrl,
        (pct, loaded, total) => {
          setPercent(pct);
          setLoadedBytes(loaded);
          setTotalBytes(total);
        },
        controller.signal,
      );
      setDownloadBlob(blob);
      setDownloading(false);
      // Tự động kích hoạt cài đặt khi tải xong
      triggerApkInstall(blob, `tui-nho-v${newVersion}.apk`);
    } catch (err) {
      if (controller.signal.aborted) {
        setDownloadError("Đã hủy tải bản cập nhật.");
      } else {
        setDownloadError(
          err instanceof Error ? err.message : "Lỗi khi tải bản cập nhật.",
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
    <>
      {/* Banner thông báo có bản cập nhật mới */}
      {newVersion && !bannerDismissed && !sheetOpen && !modalOpen && (
        <div className="apk-update-banner" role="alert">
          <div className="apk-banner-icon">
            <Sparkles size={18} />
          </div>
          <div className="apk-banner-text">
            <strong>Bản cập nhật v{newVersion}</strong>
            <span>Có phiên bản mới sẵn sàng để tải</span>
          </div>
          <div className="apk-banner-actions">
            <button
              type="button"
              className="apk-btn-update"
              onClick={() => void startDownload()}
            >
              Cập nhật ngay
            </button>
            <button
              type="button"
              className="apk-btn-dismiss"
              onClick={() => setBannerDismissed(true)}
              aria-label="Để sau"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal tiến trình tải hình con giun Pixel OS */}
      {modalOpen && (
        <div className="pixel-download-modal-backdrop" role="presentation">
          <div
            className="pixel-download-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apk-modal-title"
          >
            <div className="pixel-modal-header">
              <div className="pixel-modal-icon-glow">
                <Download size={24} />
              </div>
              <h2 id="apk-modal-title">
                {downloadBlob
                  ? "Tải bản cập nhật hoàn tất"
                  : `Đang tải Túi Nhỏ v${newVersion}`}
              </h2>
              <p className="pixel-modal-subtitle">
                {downloadBlob
                  ? "Mở tệp APK đã tải để Android tiến hành cài đè giữ nguyên dữ liệu."
                  : downloading
                    ? "Đang tải gói cài đặt từ GitHub Releases…"
                    : downloadError || "Chuẩn bị tải gói cài đặt…"}
              </p>
            </div>

            {/* Thanh tiến trình con giun */}
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

            {/* Lỗi nếu có */}
            {downloadError && (
              <div className="pixel-download-error">
                <AlertCircle size={16} />
                <span>{downloadError}</span>
              </div>
            )}

            {/* Nút thao tác */}
            <div className="pixel-modal-actions">
              {downloadBlob ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      triggerApkInstall(
                        downloadBlob,
                        `tui-nho-v${newVersion}.apk`,
                      )
                    }
                  >
                    <CheckCircle2 size={18} />
                    Mở tệp cài đặt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setBannerDismissed(true);
                    }}
                  >
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
                      onClick={() => void startDownload()}
                    >
                      Thử lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleCancelDownload();
                      setBannerDismissed(true);
                    }}
                  >
                    Để sau
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
