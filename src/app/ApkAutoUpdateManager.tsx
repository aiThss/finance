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

  // Nội dung button theo phase
  function renderButton() {
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
          <button
            type="button"
            className="apk-btn-compact-update"
            disabled
          >
            {phase === "paused"
              ? "Đang chờ…"
              : percent != null
                ? `Đang tải ${percent}%`
                : "Đang tải…"}
          </button>
        );
      case "downloaded":
        return (
          <button
            type="button"
            className="apk-btn-compact-update"
            onClick={() => void triggerInstall()}
          >
            Cập nhật ngay
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
    phase === "available" || phase === "failed";

  return (
    <aside className="apk-update-bottom-card" role="alert" aria-live="polite">
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

        {/* Progress bar worm — chỉ khi đang tải */}
        {showProgress && (
          <PixelWavyProgress
            percent={percent}
            className="apk-worm-bar"
            aria-label="Tiến độ tải cập nhật"
          />
        )}

        {/* Error text khi failed */}
        {phase === "failed" && error && (
          <span className="apk-bottom-sub" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}

        {/* Trạng thái nhắc nhở permission */}
        {phase === "needs_permission" && (
          <span className="apk-bottom-sub">
            Mở Cài đặt → Cài ứng dụng không rõ nguồn gốc → bật Heo Nhỏ
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="apk-bottom-actions">
        {renderButton()}

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
    </aside>
  );
}
