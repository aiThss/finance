/**
 * ApkUpdates — Section trong Settings để quản lý cập nhật APK.
 *
 * Dùng useApkUpdater() — cùng state với banner.
 * Không có logic download/install riêng.
 */
import { RefreshCw } from "lucide-react";
import { version as currentVersion } from "../../../package.json";
import { checkApkUpdate } from "../../lib/apk-updates";
import { useApkUpdater } from "../../hooks/useApkUpdater";
import { PixelWavyProgress } from "../../components/ui/PixelWavyProgress";
import { useState } from "react";

export function ApkUpdates() {
  const { state, isAndroid, startDownload, triggerInstall, retry } = useApkUpdater();
  const { phase, newVersion, percent, error } = state;
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkError, setCheckError] = useState("");

  // Kiểm tra thủ công bản mới (chỉ khi idle/installed)
  async function handleCheck() {
    setCheckBusy(true);
    setCheckError("");
    try {
      await checkApkUpdate(currentVersion);
      // watchApkUpdates sẽ cập nhật state tự động nếu có bản mới
    } catch (e) {
      setCheckError(
        e instanceof Error && e.name !== "TypeError" && e.name !== "TimeoutError"
          ? e.message
          : "Không kết nối được GitHub. Kiểm tra mạng và thử lại.",
      );
    } finally {
      setCheckBusy(false);
    }
  }

  // Nếu không phải Android, hiện bản hiện tại không có gì thêm
  if (!isAndroid) {
    return (
      <section className="settings-section">
        <h2>
          Túi Nhỏ <span className="muted">{currentVersion}</span>
        </h2>
        <p>Quản lý tài chính cá nhân tinh gọn, bảo mật &amp; ngoại tuyến.</p>
        <p className="muted">Không quảng cáo. Không theo dõi. Dữ liệu chỉ nằm trên thiết bị của bạn.</p>
      </section>
    );
  }

  function renderActionButton() {
    switch (phase) {
      case "available":
        return (
          <button
            type="button"
            className="primary"
            onClick={() => void startDownload()}
          >
            <RefreshCw size={16} />
            Tải bản cập nhật v{newVersion}
          </button>
        );
      case "starting":
      case "downloading":
      case "paused":
        return (
          <button type="button" className="primary" disabled>
            {phase === "paused"
              ? "Đang chờ mạng…"
              : percent != null
                ? `Đang tải… ${percent}%`
                : "Đang tải…"}
          </button>
        );
      case "downloaded":
        return (
          <button
            type="button"
            className="primary"
            onClick={() => void triggerInstall()}
          >
            Cập nhật ngay
          </button>
        );
      case "installing":
      case "needs_permission":
        return (
          <button type="button" className="primary" disabled>
            Đang cài đặt…
          </button>
        );
      case "installed":
        return (
          <p style={{ color: "var(--accent)", margin: 0 }}>
            ✓ Đã cập nhật thành công!
          </p>
        );
      case "failed":
        return (
          <button type="button" onClick={() => void retry()}>
            <RefreshCw size={16} />
            Thử lại
          </button>
        );
      default:
        return null;
    }
  }

  const showCheckButton =
    phase === "idle" || phase === "installed";

  return (
    <section className="settings-section">
      <h2>
        Túi Nhỏ <span className="muted">{currentVersion}</span>
      </h2>

      {/* Thông tin phiên bản */}
      {phase === "available" && newVersion && (
        <p>
          Phiên bản mới:{" "}
          <strong style={{ color: "var(--accent)" }}>v{newVersion}</strong>
        </p>
      )}
      {(phase === "idle" || phase === "installed") && (
        <p className="muted">Bạn đang dùng phiên bản mới nhất.</p>
      )}

      {/* Progress bar khi đang tải */}
      {(phase === "starting" || phase === "downloading" || phase === "paused") && (
        <div style={{ marginBottom: 12 }}>
          <PixelWavyProgress
            percent={percent}
            aria-label="Tiến độ tải cập nhật"
          />
        </div>
      )}

      {/* Lỗi */}
      {phase === "failed" && error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.875rem", margin: "4px 0 12px" }}>
          {error}
        </p>
      )}

      {/* Permission hint */}
      {phase === "needs_permission" && (
        <p className="muted" style={{ margin: "4px 0 12px" }}>
          Vào Cài đặt → Cài ứng dụng không rõ nguồn gốc → bật Túi Nhỏ, rồi quay lại.
        </p>
      )}

      <div className="button-stack" style={{ gap: 8 }}>
        {renderActionButton()}

        {showCheckButton && (
          <button
            type="button"
            disabled={checkBusy}
            onClick={() => void handleCheck()}
          >
            <RefreshCw size={16} />
            {checkBusy ? "Đang kiểm tra…" : "Kiểm tra bản mới"}
          </button>
        )}
      </div>

      {checkError && (
        <p role="status" className="muted" style={{ marginTop: 8, fontSize: "0.875rem" }}>
          {checkError}
        </p>
      )}
    </section>
  );
}
