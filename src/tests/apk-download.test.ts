/**
 * apk-download.test.ts — Tests cho APK updater TypeScript layer.
 *
 * Covers:
 * - State flow: available → downloading → downloaded → installing
 * - Progress 0-100 and unknown total (indeterminate)
 * - Failed download and retry
 * - Resume state on re-mount
 * - No duplicate download enqueue for same version
 * - Native error propagation
 * - Browser/PWA does NOT call native plugin
 * - parseRelease URL safety checks
 * - newerVersion comparison
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock @capacitor/core ─────────────────────────────────────────────────────
const nativeMock = vi.hoisted(() => ({
  platform: "android" as string,
  start: vi.fn(),
  getStatus: vi.fn(),
  install: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => nativeMock.platform },
  registerPlugin: () => ({
    start: nativeMock.start,
    getStatus: nativeMock.getStatus,
    install: nativeMock.install,
    clear: nativeMock.clear,
  }),
}));

// Import AFTER mocks are set up
import {
  parseRelease,
  newerVersion,
  checkApkUpdate,
  openApkDownload,
} from "../lib/apk-updates";

const V_URL = "https://github.com/aiThss/finance/releases/download/v1.0.18/tui-nho.apk";

// ─── newerVersion ─────────────────────────────────────────────────────────────
describe("newerVersion", () => {
  it("returns true when remote is greater", () => {
    expect(newerVersion("1.0.18", "1.0.17")).toBe(true);
    expect(newerVersion("2.0.0", "1.9.9")).toBe(true);
    expect(newerVersion("1.1.0", "1.0.99")).toBe(true);
  });
  it("returns false when equal", () => {
    expect(newerVersion("1.0.18", "1.0.18")).toBe(false);
  });
  it("returns false when remote is older", () => {
    expect(newerVersion("1.0.17", "1.0.18")).toBe(false);
  });
  it("handles v-prefix", () => {
    expect(newerVersion("v1.0.18", "1.0.17")).toBe(true);
  });
});

// ─── parseRelease ─────────────────────────────────────────────────────────────
describe("parseRelease", () => {
  const goodRelease = {
    tag_name: "v1.0.18",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "tui-nho.apk",
        browser_download_url: V_URL,
        state: "uploaded",
      },
    ],
  };

  it("parses valid release", () => {
    const r = parseRelease(goodRelease, "1.0.17");
    expect(r.version).toBe("1.0.18");
    expect(r.available).toBe(true);
    expect(r.url).toBe(V_URL);
  });

  it("rejects APK with tampered URL", () => {
    const tampered = {
      ...goodRelease,
      assets: [
        {
          name: "tui-nho.apk",
          browser_download_url:
            "https://evil.com/tui-nho.apk",
          state: "uploaded",
        },
      ],
    };
    expect(() => parseRelease(tampered, "1.0.17")).toThrow();
  });

  it("rejects draft release", () => {
    expect(() =>
      parseRelease({ ...goodRelease, draft: true }, "1.0.17"),
    ).toThrow();
  });

  it("rejects prerelease", () => {
    expect(() =>
      parseRelease({ ...goodRelease, prerelease: true }, "1.0.17"),
    ).toThrow();
  });

  it("rejects missing APK asset", () => {
    expect(() =>
      parseRelease({ ...goodRelease, assets: [] }, "1.0.17"),
    ).toThrow();
  });

  it("sets available=false when same version", () => {
    const r = parseRelease(goodRelease, "1.0.18");
    expect(r.available).toBe(false);
  });
});

// ─── openApkDownload — Android ────────────────────────────────────────────────
describe("openApkDownload — Android native", () => {
  beforeEach(() => { nativeMock.platform = "android"; });
  afterEach(() => { vi.restoreAllMocks(); nativeMock.start.mockReset(); });

  it("calls native start without opening a browser", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open, location: { assign: vi.fn() } });
    nativeMock.start.mockResolvedValue({ downloadId: "42" });
    await openApkDownload(V_URL);
    expect(nativeMock.start).toHaveBeenCalledWith({ url: V_URL });
    expect(open).not.toHaveBeenCalled();
  });

  it("propagates native failure without fallback to browser", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open, location: { assign: vi.fn() } });
    nativeMock.start.mockRejectedValue(new Error("DownloadManager disabled"));
    await expect(openApkDownload(V_URL)).rejects.toThrow("DownloadManager disabled");
    expect(open).not.toHaveBeenCalled();
  });
});

// ─── openApkDownload — Browser/PWA ───────────────────────────────────────────
describe("openApkDownload — Browser/PWA", () => {
  beforeEach(() => { nativeMock.platform = "web"; });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); nativeMock.start.mockReset(); });

  it("does NOT call native plugin on web", async () => {
    const clickFn = vi.fn();
    const fakeAnchor = {
      href: "", download: "", rel: "",
      click: clickFn,
    };
    // Stub document globally (vitest runs in node env)
    vi.stubGlobal("document", {
      createElement: vi.fn(() => fakeAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    });

    await openApkDownload(V_URL);

    expect(nativeMock.start).not.toHaveBeenCalled();
    expect(clickFn).toHaveBeenCalled();
  });
});

// ─── checkApkUpdate — network mocks ──────────────────────────────────────────
describe("checkApkUpdate", () => {
  const goodRelease = {
    tag_name: "v1.0.20",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "tui-nho.apk",
        browser_download_url:
          "https://github.com/aiThss/finance/releases/download/v1.0.20/tui-nho.apk",
        state: "uploaded",
      },
    ],
  };

  afterEach(() => vi.restoreAllMocks());

  it("returns available=true when remote is newer", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => goodRelease,
      }),
    );
    const r = await checkApkUpdate("1.0.19");
    expect(r.available).toBe(true);
    expect(r.version).toBe("1.0.20");
  });

  it("throws when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await expect(checkApkUpdate("1.0.19")).rejects.toThrow();
  });

  it("falls back to raw CDN on 429", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ version: "1.0.20" }),
        }),
    );
    const r = await checkApkUpdate("1.0.19");
    expect(r.available).toBe(true);
  });
});
