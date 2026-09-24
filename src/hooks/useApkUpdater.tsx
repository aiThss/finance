/**
 * useApkUpdater — Shared state machine cho APK update flow.
 *
 * Dùng chung giữa ApkAutoUpdateManager (banner) và ApkUpdates (Settings).
 * Chỉ chạy trên Android native; trả về no-op trên web/PWA.
 *
 * Thiết kế:
 * - Một singleton context cung cấp state cho toàn app
 * - Poll getStatus() mỗi 350ms khi đang download/install
 * - Dừng poll khi đạt trạng thái cuối (downloaded/failed/installed)
 * - Khôi phục state từ native khi app mở lại
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { version as currentVersion } from "../../package.json";
import { checkApkUpdate } from "../lib/apk-updates";
import { watchApkUpdates } from "../lib/watch-apk-updates";

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface NativeApkStatus {
  state:
    | "idle"
    | "pending"
    | "downloading"
    | "paused"
    | "downloaded"
    | "failed"
    | "installing"
    | "pending_user_action"
    | "needs_permission"
    | "installed";
  downloadId?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  percent?: number;
  reason?: string;
  version?: string;
  url?: string;
}

interface ApkUpdatePlugin {
  start(options: { url: string; version: string }): Promise<{ downloadId: string }>;
  getStatus(): Promise<NativeApkStatus>;
  install(): Promise<{ state: string }>;
  clear(): Promise<void>;
}

// registerPlugin trả về stub trên web (không ném lỗi)
const ApkUpdatePlugin = registerPlugin<ApkUpdatePlugin>("ApkDownload");

// ─── State types ──────────────────────────────────────────────────────────────

export type UpdaterPhase =
  | "idle"
  | "available"
  | "starting"
  | "downloading"
  | "paused"
  | "downloaded"
  | "installing"
  | "needs_permission"
  | "installed"
  | "failed";

export interface UpdaterState {
  phase: UpdaterPhase;
  newVersion: string | null;
  downloadUrl: string | null;
  /** null = indeterminate (totalBytes không biết) */
  percent: number | null;
  downloadedBytes: number;
  totalBytes: number;
  error: string;
}

const INITIAL: UpdaterState = {
  phase: "idle",
  newVersion: null,
  downloadUrl: null,
  percent: null,
  downloadedBytes: 0,
  totalBytes: 0,
  error: "",
};

function nativeToPhase(s: NativeApkStatus["state"]): UpdaterPhase {
  switch (s) {
    case "pending":
    case "downloading":
      return "downloading";
    case "paused":
      return "paused";
    case "downloaded":
      return "downloaded";
    case "installing":
    case "pending_user_action":
      return "installing";
    case "needs_permission":
      return "needs_permission";
    case "installed":
      return "installed";
    case "failed":
      return "failed";
    default:
      return "idle";
  }
}

function nativeToState(
  ns: NativeApkStatus,
  fallbackVersion: string | null,
  fallbackUrl: string | null,
): UpdaterState {
  const phase = nativeToPhase(ns.state);
  const ver = ns.version ?? fallbackVersion;
  const url = ns.url ?? fallbackUrl;
  const total = Math.max(0, ns.totalBytes ?? 0);
  const downloaded = Math.max(0, ns.downloadedBytes ?? 0);
  const percent =
    total > 0
      ? Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)))
      : ns.percent != null
        ? Math.round(ns.percent)
        : null;
  return {
    phase,
    newVersion: ver ?? null,
    downloadUrl: url ?? null,
    percent,
    downloadedBytes: downloaded,
    totalBytes: total,
    error:
      phase === "failed"
        ? ns.reason ?? "Không cài được cập nhật. Thử lại."
        : "",
  };
}

/** Trạng thái đang chạy → cần poll */
function isActivePhase(p: UpdaterPhase) {
  return p === "downloading" || p === "paused" || p === "installing" || p === "starting";
}

const POLL_MS = 350;

// ─── Context ──────────────────────────────────────────────────────────────────

interface ApkUpdaterCtx {
  state: UpdaterState;
  isDismissed: boolean;
  isAndroid: boolean;
  startDownload(): Promise<void>;
  triggerInstall(): Promise<void>;
  dismiss(): void;
  retry(): Promise<void>;
}

const ApkUpdaterContext = createContext<ApkUpdaterCtx>({
  state: INITIAL,
  isDismissed: false,
  isAndroid: false,
  startDownload: async () => {},
  triggerInstall: async () => {},
  dismiss: () => {},
  retry: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ApkUpdaterProvider({ children }: { children: ReactNode }) {
  const isAndroid = Capacitor.getPlatform() === "android";
  const [state, setState] = useState<UpdaterState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dismissedVersionRef = useRef<string | null>(null);
  const offeredVersionRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const ns = await ApkUpdatePlugin.getStatus();
      setState(prev => {
        const next = nativeToState(ns, prev.newVersion, prev.downloadUrl);
        return next;
      });
      const nextPhase = nativeToPhase(ns.state);
      if (!isActivePhase(nextPhase)) stopPoll();
    } catch {
      // Plugin ngoại lệ → giữ state
    }
  }, [stopPoll]);

  const startPoll = useCallback(() => {
    if (!isAndroid) return;
    stopPoll();
    timerRef.current = setInterval(() => void pollOnce(), POLL_MS);
  }, [isAndroid, stopPoll, pollOnce]);

  // Khôi phục state khi mount (app vừa mở lại)
  useEffect(() => {
    if (!isAndroid) return;
    void (async () => {
      try {
        const ns = await ApkUpdatePlugin.getStatus();
        if (ns.state !== "idle" && ns.state !== "installed") {
          const next = nativeToState(ns, null, null);
          setState(next);
          if (isActivePhase(next.phase)) startPoll();
        }
      } catch {
        // Plugin chưa sẵn sàng
      }
    })();
    return () => stopPoll();
  }, [isAndroid]);

  // Theo dõi GitHub releases
  useEffect(() => {
    if (!isAndroid) return;
    return watchApkUpdates(
      () => checkApkUpdate(currentVersion),
      (result) => {
        if (!result.available) {
          offeredVersionRef.current = null;
          setState(prev =>
            prev.phase === "idle" || prev.phase === "available" ? INITIAL : prev,
          );
          return;
        }
        const ver = result.version;
        offeredVersionRef.current = ver;
        setState(prev => {
          // Đang tải/cài → không reset
          if (isActivePhase(prev.phase) || prev.phase === "downloaded") return prev;
          // Version mới bằng bản đã dismiss → giữ idle
          if (dismissedVersionRef.current === ver && prev.phase === "idle") return prev;
          // Đã failed với version này → giữ failed (cho Retry)
          if (prev.phase === "failed" && prev.newVersion === ver) return prev;
          return { ...INITIAL, phase: "available", newVersion: ver, downloadUrl: result.url };
        });
      },
      true,
    );
  }, [isAndroid]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const startDownload = useCallback(async () => {
    if (!isAndroid) return;
    const { newVersion, downloadUrl } = stateRef.current;
    if (!newVersion || !downloadUrl) return;
    setState(prev => ({ ...prev, phase: "starting", error: "" }));
    try {
      await ApkUpdatePlugin.start({ url: downloadUrl, version: newVersion });
      setState(prev => ({
        ...prev,
        phase: "downloading",
        percent: null,
        downloadedBytes: 0,
        totalBytes: 0,
      }));
      startPoll();
    } catch (e) {
      setState(prev => ({
        ...prev,
        phase: "failed",
        error:
          e instanceof Error
            ? e.message
            : "Không bắt đầu tải được. Thử lại.",
      }));
    }
  }, [isAndroid, startPoll]);

  const triggerInstall = useCallback(async () => {
    if (!isAndroid) return;
    setState(prev => ({ ...prev, phase: "installing", error: "" }));
    try {
      const result = await ApkUpdatePlugin.install();
      if (result.state === "needs_permission") {
        setState(prev => ({
          ...prev,
          phase: "needs_permission",
          error: "Cho phép Túi Nhỏ cài cập nhật trong Cài đặt.",
        }));
      } else {
        startPoll();
      }
    } catch (e) {
      setState(prev => ({
        ...prev,
        phase: "failed",
        error: e instanceof Error ? e.message : "Không cài được cập nhật. Thử lại.",
      }));
    }
  }, [isAndroid, startPoll]);

  const dismiss = useCallback(() => {
    if (stateRef.current.newVersion) {
      dismissedVersionRef.current = stateRef.current.newVersion;
    }
    setState(prev =>
      prev.phase === "available" ? { ...prev, phase: "idle" } : prev,
    );
  }, []);

  const retry = useCallback(async () => {
    if (!isAndroid) return;
    try { await ApkUpdatePlugin.clear(); } catch { /* ignore */ }
    setState(prev => ({
      ...INITIAL,
      phase: "available",
      newVersion: prev.newVersion,
      downloadUrl: prev.downloadUrl,
    }));
  }, [isAndroid]);

  const isDismissed =
    state.newVersion !== null &&
    dismissedVersionRef.current === state.newVersion &&
    state.phase === "idle";

  const ctx: ApkUpdaterCtx = {
    state,
    isDismissed,
    isAndroid,
    startDownload,
    triggerInstall,
    dismiss,
    retry,
  };

  return (
    <ApkUpdaterContext.Provider value={ctx}>
      {children}
    </ApkUpdaterContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApkUpdater() {
  return useContext(ApkUpdaterContext);
}
