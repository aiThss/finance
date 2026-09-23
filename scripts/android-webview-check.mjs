import { _android as android, expect } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Supplemental debug-only inspection of the actual installed WebView. The
// release smoke deliberately uses OS accessibility and screenshots instead.
const devices = await android.devices();
const device = devices.find(
  (d) => d.serial() === (process.env.ANDROID_SERIAL ?? "emulator-5554"),
);
assert(device, "Emulator unavailable");
assert(device.serial().startsWith("emulator-"), "Use a disposable emulator");
try {
  await device.shell("am start -W -n com.aithss.finance/.MainActivity");
  const webview = await device.webView({ pkg: "com.aithss.finance" });
  const page = await webview.page();
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
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
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
    { encoding: "utf8" },
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
  for (const d of devices) await d.close();
}
