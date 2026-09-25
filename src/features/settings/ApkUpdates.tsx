/**
 * ApkUpdates — Section trong Settings để quản lý cập nhật APK.
 *
 * - Trên Android Native: Dùng useApkUpdater() chia sẻ cùng state với banner,
 *   kết nối trực tiếp DownloadManager + PackageInstaller.
 * - Trên Web/PWA: Dùng trình tải file của trình duyệt (openApkDownload),
 *   tuyệt đối không gọi native plugin.
 */
import { RefreshCw, Download, Sparkles, ExternalLink } from "lucide-react";
import { version as currentVersion } from "../../../package.json";
import { checkApkUpdate, releasesUrl, openApkDownload } from "../../lib/apk-updates";
import { useApkUpdater } from "../../hooks/useApkUpdater";
import { PixelWavyProgress } from "../../components/ui/PixelWavyProgress";
import { useState } from "react";

export function ApkUpdates() {
  const { state, isAndroid, startDownload, triggerInstall, retry } = useApkUpdater();
  const { phase, newVersion, percent, error } = state;

  // State dành cho Web/PWA
  const [webBusy, setWebBusy] = useState(false);
  const [webStatus, setWebStatus] = useState("");
  const [webUpdate, setWebUpdate] = useState<Awaited<ReturnType<typeof checkApkUpdate>> | null>(null);
  const [webDownloadStarted, setWebDownloadStarted] = useState(false);
  const [webDownloadBusy, setWebDownloadBusy] = useState(false);

  // Native Android check button state
  const [nativeCheckBusy, setNativeCheckBusy] = useState(false);
  const [nativeCheckError, setNativeCheckError] = useState("");

  // Handler trên Web/PWA
  async function handleWebCheck() {
    setWebBusy(true);
    setWebUpdate(null);
    setWebDownloadStarted(false);
    setWebStatus("Đang kiểm tra bản mới…");
    try {
      const result = await checkApkUpdate(currentVersion);
      setWebUpdate(result);
      setWebStatus(
        result.available
          ? `Có phiên bản ${result.version} để tải.`
          : "Bạn đang dùng phiên bản mới nhất.",
      );
    } catch (e) {
      setWebStatus(
        e instanceof Error &&
          e.name !== "TypeError" &&
          e.name !== "TimeoutError"
          ? e.message
          : "Không kết nối được GitHub. Kiểm tra mạng và thử lại.",
      );
    } finally {
      setWebBusy(false);
    }
  }

  async function handleWebStartDownload() {
    if (!webUpdate?.url || webDownloadBusy) return;
    setWebDownloadBusy(true);
    setWebDownloadStarted(false);
    setWebStatus("Đang bắt đầu tải APK…");
    try {
      await openApkDownload(webUpdate.url);
      setWebDownloadStarted(true);
      setWebStatus("Đã gửi yêu cầu tải APK.");
    } catch {
      setWebStatus("Chưa bắt đầu tải được APK. Vui lòng thử lại.");
    } finally {
      setWebDownloadBusy(false);
    }
  }

  // Handler trên Android Native
  async function handleNativeCheck() {
    setNativeCheckBusy(true);
    setNativeCheckError("");
    try {
      await checkApkUpdate(currentVersion);
    } catch (e) {
      setNativeCheckError(
        e instanceof Error && e.name !== "TypeError" && e.name !== "TimeoutError"
          ? e.message
          : "Không kết nối được GitHub. Kiểm tra mạng và thử lại.",
      );
    } finally {
      setNativeCheckBusy(false);
    }
  }

  // ─── Giao diện Web / PWA ──────────────────────────────────────────────────
  if (!isAndroid) {
    return (
      <section className="settings-section">
        <h2>Cập nhật APK</h2>
        <p className="muted">
          Phiên bản hiện tại: {currentVersion}. Kiểm tra bản Android mới trên GitHub.
        </p>
        <button
          disabled={webBusy || webDownloadBusy}
          onClick={() => void handleWebCheck()}
        >
          <RefreshCw size={18} />
          {webBusy ? "Đang kiểm tra…" : "Kiểm tra cập nhật APK"}
        </button>
        {webStatus && <p role="status">{webStatus}</p>}

        {webUpdate?.available && (
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
                onClick={() => void handleWebStartDownload()}
                disabled={webDownloadBusy}
              >
                <Sparkles size={16} />{" "}
                {webDownloadBusy
                  ? "Đang bắt đầu tải…"
                  : webDownloadStarted
                    ? "Tải lại APK"
                    : "Tải bản cập nhật"}
              </button>
              <button
                type="button"
                onClick={() => void handleWebStartDownload()}
                disabled={webDownloadBusy}
                className="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  textDecoration: "none",
                }}
              >
                <Download size={16} /> Tải APK {webUpdate.version}
              </button>
            </div>
            {webDownloadStarted && (
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

  // ─── Giao diện Android Native ─────────────────────────────────────────────
  function renderNativeActionButton() {
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

  const showCheckButton = phase === "idle" || phase === "installed";

  return (
    <section className="settings-section">
      <h2>
        Heo Nhỏ <span className="muted">{currentVersion}</span>
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
          Vào Cài đặt → Cài ứng dụng không rõ nguồn gốc → bật Heo Nhỏ, rồi quay lại.
        </p>
      )}

      <div className="button-stack" style={{ gap: 8 }}>
        {renderNativeActionButton()}

        {showCheckButton && (
          <button
            type="button"
            disabled={nativeCheckBusy}
            onClick={() => void handleNativeCheck()}
          >
            <RefreshCw size={16} />
            {nativeCheckBusy ? "Đang kiểm tra…" : "Kiểm tra bản mới"}
          </button>
        )}
      </div>

      {nativeCheckError && (
        <p role="status" className="muted" style={{ marginTop: 8, fontSize: "0.875rem" }}>
          {nativeCheckError}
        </p>
      )}
    </section>
  );
}
