import { _android as android, expect } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Supplemental debug-only inspection of the actual installed WebView. The
// release smoke deliberately uses OS accessibility and screenshots instead.
let phase = "discover Android devices";
const mark = (name) => { phase = name; console.log(`WebView check: ${name}`); };
const watchdog = setTimeout(() => {
  console.error(`WebView check exceeded 5 minutes during: ${phase}`);
  process.exit(1);
}, 300000);
mark(phase);
const devices = await android.devices();
const device = devices.find(
  (d) => d.serial() === (process.env.ANDROID_SERIAL ?? "emulator-5554"),
);
assert(device, "Emulator unavailable");
assert(device.serial().startsWith("emulator-"), "Use a disposable emulator");
try {
  device.setDefaultTimeout(30000);
  mark("launch app and discover debuggable WebView");
  await device.shell("am start -W -n com.aithss.finance/.MainActivity");
  const webview = await device.webView({ pkg: "com.aithss.finance" });
  mark("attach to WebView");
  const page = await webview.page();
  page.setDefaultTimeout(30000);
  mark("verify native state and navigation");
  await expect(page.locator(".bottom-nav")).toBeVisible();
  const state = await page.evaluate(async () => ({
    native: window.Capacitor?.isNativePlatform(),
    viewport: document.querySelector('meta[name="viewport"]').content,
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    workerControlsPage: !!navigator.serviceWorker.controller,
    agent: navigator.userAgent,
  }));
  assert.equal(state.native, true);
  assert.equal(state.registrations, 0);
  assert.equal(state.workerControlsPage, false);
  assert(state.viewport.includes("viewport-fit=cover"));
  assert.equal(await page.locator(".update-prompt").count(), 0);
  const nav = page.locator(".bottom-nav");
  for (const label of ["Tổng quan", "Giao dịch", "Ví tiền", "Khác"]) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await link.click();
    await expect(link).toHaveCSS("text-decoration-line", "none");
  }
  await expect(nav).toHaveCSS("backdrop-filter", "none");
  // Simulate a worker left by v1.0.1 and exercise upgrade cleanup on a real
  // native WebView. This test runs only on the disposable emulator.
  mark("seed legacy service worker");
  await page.evaluate(async () => {
    // Seed an actual controlling worker without depending on production PWA
    // precaching. This fixture is packaged only in the debug APK.
    await navigator.serviceWorker.register("/qa-legacy-worker.js", { scope: "/" });
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Legacy worker did not become active within 30s")), 30000)),
    ]);
  });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ""))
    .toContain("/qa-legacy-worker.js");
  mark("verify legacy worker cleanup");
  await page.reload();
  await expect(page.locator(".bottom-nav")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    )
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(false);
  state.legacyWorkerRetired = true;
  mark("verify encrypted key persistence and removal");
  const dir = process.env.NATIVE_ARTIFACT_DIR ?? "artifacts/android-smoke";
  fs.mkdirSync(dir, { recursive: true });
  await nav.getByRole("link", { name: "Khác", exact: true }).click();
  await page.getByRole("link", { name: /Cài đặt/ }).click();
  const testKey = "test-only-emulator-key-1234567890";
  await page.getByLabel("Gemini API key", { exact: true }).fill(testKey);
  await page.getByRole("button", { name: "Lưu API key" }).click();
  await expect(
    page.getByText("Đã lưu key. Bạn có thể kiểm tra kết nối."),
  ).toBeVisible();
  const encryptedPrefs = execFileSync(
    "adb",
    [
      "-s",
      device.serial(),
      "shell",
      "run-as",
      "com.aithss.finance",
      "cat",
      "shared_prefs/local-gemini.xml",
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  assert(
    encryptedPrefs.includes("ciphertext") && encryptedPrefs.includes("iv"),
  );
  assert(!encryptedPrefs.includes(testKey), "Key persisted in plaintext");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Kiểm tra key Gemini" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Xóa API key" }).click();
  await expect(
    page.getByRole("button", { name: "Kiểm tra key Gemini" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Kiểm tra key Gemini" }),
  ).toBeDisabled();
  state.encryptedKeyPersistenceAndRemoval = true;
  mark("verify release update check");
  await page.getByText("Cách lấy API key", { exact: true }).click();
  await page
    .locator(".settings-section")
    .filter({
      has: page.getByRole("heading", { name: "Trợ lý AI", exact: true }),
    })
    .screenshot({ path: `${dir}/gemini-settings.png` });
  await page.getByRole("button", { name: "Kiểm tra cập nhật APK" }).click();
  await expect(page.getByText("Bạn đang dùng phiên bản mới nhất.")).toBeVisible(
    { timeout: 20000 },
  );
  await page
    .locator(".settings-section")
    .filter({
      has: page.getByRole("heading", { name: "Cập nhật APK", exact: true }),
    })
    .screenshot({ path: `${dir}/apk-updates.png` });
  state.liveApkCheck = true;
  fs.writeFileSync(`${dir}/webview.json`, JSON.stringify(state, null, 2));
  console.log(
    "Installed Android WebView: native platform, zero service workers, cover viewport, touch navigation and no blur verified.",
  );
} finally {
  mark("close Android connections");
  for (const d of devices) await d.close();
  clearTimeout(watchdog);
}
