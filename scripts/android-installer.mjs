import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseUiTree, systemAnrWaitButton, installSourceSwitch } from "./installer-ui.mjs";

// Usage: node scripts/android-installer.mjs candidate.apk [v1.0.19.apk v1.0.21.apk]
// --probe-only accepts arbitrary historical APKs and records failures as evidence.
const probeOnly = process.argv.includes("--probe-only");
const apks = process.argv.slice(2).filter((arg) => arg !== "--probe-only");
assert(apks.length, "Supply APK paths");
const serial = process.env.ANDROID_SERIAL ?? execFileSync("adb", ["devices"], { encoding: "utf8" })
  .match(/^(emulator-\d+)\s+device/m)?.[1];
assert(serial?.startsWith("emulator-"), "Requires a disposable emulator; never a user's device");
const adb = (...args) => execFileSync("adb", ["-s", serial, ...args], { maxBuffer: 32 * 1024 * 1024, stdio: "pipe", timeout: 60000 });
const shell = (...args) => adb("shell", ...args).toString().trim();
assert.equal(shell("getprop", "ro.kernel.qemu"), "1", "Emulator guard");
if (process.env.EXPECTED_ANDROID_API) {
  assert.equal(shell("getprop", "ro.build.version.sdk"), process.env.EXPECTED_ANDROID_API);
}
const dir = process.env.INSTALLER_ARTIFACT_DIR ?? "artifacts/installer-runtime";
fs.mkdirSync(dir, { recursive: true });
if (!probeOnly) fs.rmSync(`${dir}/success.json`, { force: true });
const probe = "com.aithss.installerprobe";
const app = "com.aithss.finance";
const remote = `/sdcard/Android/data/${probe}/files`;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const startProbe = (mode) => {
  // ResourcesManager caches archives by path. A fresh process is essential when
  // candidate.apk changes; otherwise historical comparisons can read stale icons.
  shell("am", "force-stop", probe);
  return shell("am", "start", "-W", "-f", "0x10008000", "-n", `${probe}/.ProbeActivity`, "--es", "mode", mode);
};
assert.match(adb("install", "-r", "android/installer-probe/build/outputs/apk/debug/installer-probe-debug.apk").toString(), /Success/);
startProbe("prepare");

async function inspect(apk, strict) {
  shell("rm", "-f", `${remote}/report.json`);
  adb("push", apk, `${remote}/candidate.apk`);
  startProbe("probe");
  let text;
  for (let i = 0; i < 30; i++) {
    try { text = shell("cat", `${remote}/report.json`); if (text.startsWith("{")) break; } catch { /* pending */ }
    await pause(500);
  }
  assert(text, "Probe did not produce report.json; inspect logcat for the QA activity failure");
  const report = JSON.parse(text);
  fs.writeFileSync(`${dir}/${report.version ?? "error"}-${path.basename(apk)}.json`, JSON.stringify(report, null, 2));
  assert(!report.error, report.error);
  assert.equal(report.icons.length, 16);
  if (strict) {
    assert.equal(report.canRequestPackageInstalls, true, "Installer QA is not authorized as an install source");
    for (const icon of [report.packageManagerIcon, ...report.icons]) {
      assert.equal(icon.class, "AdaptiveIconDrawable", "Must load the real adaptive icon, not a fallback");
      for (const layer of [icon, icon.foreground, icon.background].filter(Boolean)) {
        assert(layer.width > 0 && layer.height > 0, JSON.stringify(icon));
        assert.equal(layer.parcelBitmap, "ok", JSON.stringify(icon));
      }
    }
    for (const icon of report.icons) {
      assert(Math.abs(icon.foreground.width - 108 * icon.density / 160) <= 1,
        `Unexpected foreground scaling: ${JSON.stringify(icon)}`);
      assert.notEqual(icon.foregroundDensity, 65534, "Bitmap selected with DENSITY_ANY");
    }
  }
  console.log(`${apk}: API ${report.api}, ${report.icons.length} icon/density samples recorded`);
  return report;
}

async function nodes(label) {
  shell("rm", "-f", "/sdcard/installer-ui.xml");
  let dumped;
  try { dumped = shell("uiautomator", "dump", "/sdcard/installer-ui.xml"); }
  catch (error) {
    // Android can kill the short-lived automation process even after it wrote
    // the tree. Only use a freshly completed dump; otherwise find() retries.
    dumped = error.stdout?.toString() ?? "";
  }
  if (dumped.includes("ERROR") || !dumped.includes("dumped to")) return [];
  const xml = shell("cat", "/sdcard/installer-ui.xml");
  fs.writeFileSync(`${dir}/${label}.xml`, xml);
  return parseUiTree(xml);
}
function click(node) {
  const [x1, y1, x2, y2] = node.bounds.match(/\d+/g).map(Number);
  shell("input", "tap", String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2)));
}
let systemAnrRecoveries = 0;
async function find(label, predicate) {
  const deadline = performance.now() + 180000;
  while (performance.now() < deadline) {
    const current = await nodes(label);
    const wait = systemAnrWaitButton(current);
    if (wait) {
      assert(systemAnrRecoveries < 3, "Emulator remains unhealthy after three system ANRs");
      const evidence = `${dir}/system-anr-${++systemAnrRecoveries}`;
      fs.copyFileSync(`${dir}/${label}.xml`, `${evidence}.xml`);
      fs.writeFileSync(`${evidence}.png`, adb("exec-out", "screencap", "-p"));
      console.log(`System app ANR obstructed ${label}; saved ${evidence}, selecting Wait (${systemAnrRecoveries}/3)`);
      click(wait);
      await pause(2000);
      continue;
    }
    const node = current.find(predicate);
    if (node) return node;
    await pause(500);
  }
  fs.writeFileSync(`${dir}/${label}-timeout.png`, adb("exec-out", "screencap", "-p"));
  throw new Error(`UI element missing after 180s: ${label}`);
}
async function tapText(text) { click(await find(text, (n) => n.text === text || n["content-desc"] === text)); }
async function allowInstallSource() {
  // Use the platform UI, rather than assuming a package-level appop has granted
  // the UID-level permission on a pristine emulator. This is QA-app-only setup.
  shell("am", "start", "-W", "-a", "android.settings.MANAGE_UNKNOWN_APP_SOURCES", "-d", `package:${probe}`);
  await find("install-source-settings", (n) => n.package === "com.android.settings" && n.text === "Installer QA");
  await find("install-source-label", (n) => n.package === "com.android.settings" && n.text === "Allow from this source");
  const isSwitch = installSourceSwitch;
  const toggle = await find("install-source-toggle", isSwitch);
  if (toggle.checked !== "true") click(toggle);
  await find("install-source-allowed", (n) => isSwitch(n) && n.checked === "true");
  fs.writeFileSync(`${dir}/install-source-allowed.png`, adb("exec-out", "screencap", "-p"));
  shell("input", "keyevent", "KEYCODE_BACK");
}
async function launch() {
  shell("am", "start", "-W", "-n", `${app}/.MainActivity`);
  await find("app-launched", (n) => n.text === "Ví tiền");
}
function uninstall() {
  if (shell("pm", "list", "packages", app).split(/\r?\n/).includes(`package:${app}`)) {
    assert.match(shell("pm", "uninstall", app), /Success/);
  }
}
async function seedWallet() {
  await launch();
  await tapText("Ví tiền");
  await tapText("Thêm tài khoản");
  click(await find("wallet-input", (n) => n.class === "android.widget.EditText"));
  // Cold emulator/WebView startup can drop rapid synthetic key events. Enter
  // characters deliberately and verify the complete value BEFORE saving data.
  await pause(500);
  for (const character of "InstallerRetention") {
    shell("input", "text", character);
    await pause(150);
  }
  await find("wallet-input-complete", (n) => n.class === "android.widget.EditText" && n.text === "InstallerRetention");
  shell("input", "keyevent", "KEYCODE_BACK");
  await tapText("Lưu tài khoản");
  await find("wallet-seeded", (n) => n.class === "android.widget.Button" && n.text.startsWith("InstallerRetention "));
  shell("am", "force-stop", app);
}

async function installThroughUi(apk, label, update, version) {
  adb("push", apk, `${remote}/candidate.apk`);
  startProbe("open");
  const button = await find(`${label}-confirmation`, (n) =>
    /packageinstaller/.test(n.package) && n.enabled === "true" &&
    (update ? /^(Update|Cập nhật)$/i : /^(Install|Cài đặt)$/i).test(n.text));
  fs.writeFileSync(`${dir}/${label}-confirmation.png`, adb("exec-out", "screencap", "-p"));
  click(button);
  await find(`${label}-complete`, (n) => /packageinstaller/.test(n.package) &&
    (n["resource-id"].endsWith(":id/install_success") || /^(App installed\.|Đã cài đặt ứng dụng\.)$/.test(n.text)));
  fs.writeFileSync(`${dir}/${label}-complete.png`, adb("exec-out", "screencap", "-p"));
  const installed = shell("dumpsys", "package", app);
  assert(installed.includes(`versionCode=${version} `), "Installed version did not change");
  fs.writeFileSync(`${dir}/${label}-package.txt`, installed);
  click(await find(`${label}-done`, (n) => /packageinstaller/.test(n.package) && /^(Done|Xong)$/i.test(n.text)));
  await launch();
  if (update) {
    await tapText("Ví tiền");
    await find(`${label}-wallet-retained`, (n) => n.class === "android.widget.Button" && n.text.startsWith("InstallerRetention "));
  }
  console.log(`${label}: system installer completed; version ${version}${update ? "; wallet retained" : ""}`);
}

try {
  if (probeOnly) {
    for (const apk of apks) await inspect(apk, false);
  } else {
    const [candidate, ...baselines] = apks;
    await allowInstallSource();
    const report = await inspect(candidate, true);
    // Destructive setup is restricted to the disposable emulator by BOTH guards above.
    uninstall();
    await installThroughUi(candidate, "fresh", false, report.versionCode);
    const upgraded = new Set();
    for (const baseline of baselines) {
      const old = await inspect(baseline, false);
      assert(["1.0.19", "1.0.21"].includes(old.version));
      assert(!upgraded.has(old.version), "Duplicate upgrade baseline");
      assert(old.versionCode < report.versionCode);
      uninstall();
      assert.match(adb("install", baseline).toString(), /Success/);
      await seedWallet();
      await installThroughUi(candidate, `upgrade-${old.version}`, true, report.versionCode);
      upgraded.add(old.version);
    }
    fs.writeFileSync(`${dir}/success.json`, JSON.stringify({ api: report.api,
      candidateVersion: report.version, freshInstall: true, upgrades: [...upgraded],
      walletRetained: true, systemAnrRecoveries, transport: "content URI + read grant + Package Installer UI" }, null, 2));
  }
} finally {
  try { fs.writeFileSync(`${dir}/logcat.txt`, adb("logcat", "-d", "-t", "4000")); }
  catch (error) { fs.writeFileSync(`${dir}/logcat.txt`, error.stdout ?? String(error)); }
}
