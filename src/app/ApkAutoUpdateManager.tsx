/**
 * ApkAutoUpdateManager — Banner cập nhật APK cho Android.
 *
 * Dùng useApkUpdater() để đọc state chung.
 * Không có logic download/install riêng — tất cả qua hook.
 */
import { useApkUpdater } from "../hooks/useApkUpdater";
import { PixelWavyProgress } from "../components/ui/PixelWavyProgress";
import { TuiNhoMark } from "../components/brand/TuiNhoMark";
import { X } from "lucide-react";

export default function ApkAutoUpdateManager({
  sheetOpen,
}: {
  sheetOpen: boolean;
}) {
  const { state, isDismissed, isAndroid, startDownload, triggerInstall, dismiss, retry } =
    useApkUpdater();

  // Chỉ hiển thị trên Android
  if (!isAndroid) return null;

  const { phase, newVersion, percent, error } = state;

  // Không hiển thị khi: idle, installed, dismissed, hoặc đang mở sheet giao dịch
  if (
    phase === "idle" ||
    phase === "installed" ||
    isDismissed ||
    sheetOpen
  )
    return null;

  // Nội dung subtitle theo phase
  function renderSubtitle() {
    switch (phase) {
      case "available":
        return "Bản cập nhật mới sẵn sàng";
      case "starting":
        return "Đang chuẩn bị tải…";
      case "downloading":
        return percent != null ? `Đang tải ${percent}%…` : "Đang tải bản cập nhật…";
      case "paused":
        return "Đang chờ kết nối mạng…";
      case "downloaded":
        return "Đã tải xong · Nhấn để khởi động lại";
      case "installing":
        return "Đang cài đặt… Sẽ tự mở lại sau giây lát";
      case "needs_permission":
        return "Cần cấp quyền cài đặt APK trong Cài đặt";
      case "failed":
        return error || "Không cài được cập nhật. Thử lại.";
      default:
        return null;
    }
  }

  // Nội dung action theo phase
  function renderAction() {
    switch (phase) {
      case "available":
        return (
          <button
            type="button"
            className="apk-btn-compact-update"
            onClick={() => void startDownload()}
          >
            Cập nhật
          </button>
        );
      case "starting":
      case "downloading":
      case "paused":
        return (
          <span className="apk-percent-pill" aria-live="polite">
            {phase === "paused" ? "Chờ" : percent != null ? `${percent}%` : "Tải…"}
          </span>
        );
      case "downloaded":
        return (
          <button
            type="button"
            className="apk-btn-compact-update"
            onClick={() => void triggerInstall()}
          >
            Khởi động lại
          </button>
        );
      case "installing":
      case "needs_permission":
        return (
          <button
            type="button"
            className="apk-btn-compact-update"
            disabled
          >
            Đang cài…
          </button>
        );
      case "failed":
        return (
          <button
            type="button"
            className="apk-btn-compact-update secondary"
            onClick={() => void retry()}
          >
            Thử lại
          </button>
        );
      default:
        return null;
    }
  }

  const showProgress =
    phase === "starting" ||
    phase === "downloading" ||
    phase === "paused";

  const showDismiss =
    phase === "available" || phase === "downloaded" || phase === "failed";

  return (
    <aside className="apk-update-bottom-card" role="alert" aria-live="polite">
      <div className="apk-bottom-main-row">
        {/* Icon logo */}
        <div className="apk-bottom-icon">
          <TuiNhoMark size={18} />
        </div>

        {/* Info */}
        <div className="apk-bottom-info">
          <div className="apk-bottom-title">
            <strong>Heo Nhỏ{newVersion ? ` v${newVersion}` : ""}</strong>
            {phase === "available" && (
              <span className="apk-version-badge">Mới</span>
            )}
          </div>
          <span
            className="apk-bottom-sub"
            style={phase === "failed" ? { color: "var(--danger)" } : undefined}
          >
            {renderSubtitle()}
          </span>
        </div>

        {/* Actions */}
        <div className="apk-bottom-actions">
          {renderAction()}

          {showDismiss && (
            <button
              type="button"
              className="apk-btn-compact-dismiss"
              onClick={dismiss}
              aria-label="Để sau"
              title="Để sau"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar worm — toàn chiều rộng thẻ ở dưới */}
      {showProgress && (
        <div className="apk-bottom-progress-track">
          <PixelWavyProgress
            percent={percent}
            className="apk-worm-bar"
            aria-label="Tiến độ tải cập nhật"
          />
        </div>
      )}
    </aside>
  );
}
