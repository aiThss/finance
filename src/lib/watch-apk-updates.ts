import { App } from "@capacitor/app";

// Every foreground session checks again; overlapping lifecycle events share a request.
export function watchApkUpdates<T>(
  check: () => Promise<T>,
  onResult: (result: T) => void,
  native: boolean,
) {
  let disposed = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function run() {
    if (
      disposed ||
      pending ||
      !navigator.onLine ||
      document.visibilityState === "hidden"
    )
      return;
    pending = true;
    try {
      const result = await check();
      if (!disposed) onResult(result);
    } catch {
      // Offline or GitHub failures never interrupt recording a transaction.
    } finally {
      pending = false;
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 250);
  };
  const visible = () => {
    if (document.visibilityState === "visible") schedule();
  };
  window.addEventListener("online", schedule);
  document.addEventListener("visibilitychange", visible);
  const listener = native
    ? App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) schedule();
      }).catch(() => undefined)
    : undefined;
  void run();
  return () => {
    disposed = true;
    clearTimeout(timer);
    window.removeEventListener("online", schedule);
    document.removeEventListener("visibilitychange", visible);
    void listener?.then((handle) => handle?.remove()).catch(() => {});
  };
}
