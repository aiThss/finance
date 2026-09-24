import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchApkUpdates } from "../lib/watch-apk-updates";
const native = vi.hoisted(() => ({
  resume: undefined as undefined | ((state: { isActive: boolean }) => void),
  remove: vi.fn(),
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_: string, listener: typeof native.resume) => {
      native.resume = listener;
      return { remove: native.remove };
    }),
  },
}));
let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible" }),
  );
  vi.stubGlobal("navigator", { onLine: true });
  native.remove.mockClear();
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("automatic APK checks", () => {
  it("checks at launch, resumes, and coalesces native/browser resume events", async () => {
    const check = vi.fn().mockResolvedValue("new");
    const notify = vi.fn();
    stop = watchApkUpdates(check, notify, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledTimes(1);
    native.resume?.({ isActive: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(300);
    expect(check).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenLastCalledWith("new");
  });
  it("recovers from offline launch and a failed request", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const check = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue("new");
    const notify = vi.fn();
    stop = watchApkUpdates(check, notify, false);
    expect(check).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { onLine: true });
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(300);
    expect(notify).not.toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(300);
    expect(notify).toHaveBeenCalledWith("new");
  });
  it("ignores background, overlaps, and results after unmount", async () => {
    let resolve!: (value: string) => void;
    const check = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const notify = vi.fn();
    stop = watchApkUpdates(check, notify, true);
    native.resume?.({ isActive: true });
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(300);
    expect(check).toHaveBeenCalledTimes(1);
    stop();
    stop = undefined;
    resolve("new");
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).not.toHaveBeenCalled();
    expect(native.remove).toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(300);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
