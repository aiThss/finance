import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ start: vi.fn(), platform: "android" }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform },
  registerPlugin: () => ({ start: native.start }),
}));
import { openApkDownload } from "../lib/apk-updates";

const url =
  "https://github.com/aiThss/finance/releases/download/v1.0.18/tui-nho.apk";

describe("Android APK downloads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    native.start.mockReset();
  });

  it("awaits Android's download queue without opening a browser", async () => {
    const open = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", { open, location: { assign } });
    let accept!: (value: { downloadId: string }) => void;
    native.start.mockReturnValue(
      new Promise((resolve) => {
        accept = resolve;
      }),
    );
    const done = vi.fn();
    const pending = openApkDownload(url).then(done);
    await Promise.resolve();
    expect(native.start).toHaveBeenCalledWith({ url });
    expect(done).not.toHaveBeenCalled();
    accept({ downloadId: "42" });
    await pending;
    expect(done).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("reports native failure without falling back to a browser", async () => {
    const open = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", { open, location: { assign } });
    native.start.mockRejectedValue(new Error("Download manager disabled"));
    await expect(openApkDownload(url)).rejects.toThrow(
      "Download manager disabled",
    );
    expect(open).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
