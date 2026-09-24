import { watchApkUpdates } from "../lib/watch-apk-updates";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Download, ExternalLink, X, RefreshCw } from "lucide-react";
import { version } from "../../package.json";
import {
  checkApkUpdate,
  releasesUrl,
  openApkDownload,
} from "../lib/apk-updates";

export default function ApkAutoUpdateManager({
  sheetOpen,
}: {
  sheetOpen: boolean;
}) {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const offeredVersion = useRef<string | null>(null);
  useEffect(
    () =>
      watchApkUpdates(
        () => checkApkUpdate(version),
        (result) => {
          if (result.available) {
            if (offeredVersion.current !== result.version) {
              setBannerDismissed(false);
              setDownloadTriggered(false);
            }
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

  async function handleStartDownload() {
    if (!downloadUrl || downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError("");
    try {
      await openApkDownload(downloadUrl);
      setDownloadTriggered(true);
    } catch {
      setDownloadTriggered(false);
      setDownloadError("Chưa bắt đầu tải được APK. Vui lòng thử lại.");
    } finally {
      setDownloadBusy(false);
    }
  }

  // Nếu không có bản mới, hoặc người dùng đã đóng, hoặc đang mở form giao dịch: không hiển thị
  if (!newVersion || bannerDismissed || sheetOpen) {
    return null;
  }

  return (
    <aside className="apk-update-bottom-card" role="alert" aria-live="polite">
      <div className="apk-bottom-icon">
        {downloadTriggered ? (
          <Download size={18} className="pulsing-icon" />
        ) : (
          <Sparkles size={18} />
        )}
      </div>

      <div className="apk-bottom-info">
        <div className="apk-bottom-title">
          <strong>Túi Nhỏ v{newVersion}</strong>
          <span className="apk-version-badge">Mới</span>
        </div>
        <span className="apk-bottom-sub">
          {downloadError ||
            (downloadBusy
              ? "Đang bắt đầu tải…"
              : downloadTriggered
                ? "Đã gửi yêu cầu tải. Kiểm tra thanh thông báo để cài đặt"
                : "Đã có bản cập nhật mới sẵn sàng")}
        </span>
      </div>

      <div className="apk-bottom-actions">
        {downloadTriggered ? (
          <>
            <button
              type="button"
              className="apk-btn-compact-update secondary"
              onClick={handleStartDownload}
              disabled={downloadBusy}
              title="Tải lại nếu chưa bắt đầu"
            >
              <RefreshCw size={13} style={{ marginRight: 4 }} />
              Tải lại
            </button>
            <a
              href={releasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apk-btn-compact-external"
              title="Mở trang phát hành trên GitHub"
              aria-label="Mở trang GitHub Releases"
            >
              <ExternalLink size={14} />
            </a>
          </>
        ) : (
          <button
            type="button"
            className="apk-btn-compact-update"
            onClick={handleStartDownload}
            disabled={downloadBusy}
          >
            Cập nhật
          </button>
        )}

        <button
          type="button"
          className="apk-btn-compact-dismiss"
          onClick={() => setBannerDismissed(true)}
          aria-label="Để sau"
          title="Để sau"
        >
          <X size={16} />
        </button>
      </div>

      {downloadBusy && <div className="apk-bottom-progress-bar" />}
    </aside>
  );
}
