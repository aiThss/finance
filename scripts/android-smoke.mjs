import { execFileSync } from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
import sharp from "sharp";
import { systemAnrWaitButton } from "./installer-ui.mjs";

// Run only on a disposable emulator. Never clear or seed a user's device.
const serial =
  process.env.ANDROID_SERIAL ??
  execFileSync("adb", ["devices"], { encoding: "utf8" }).match(
    /^(emulator-\d+)\s+device/m,
  )?.[1];
assert(
  serial?.startsWith("emulator-"),
  "Native smoke requires a disposable emulator (ANDROID_SERIAL).",
);
const adb = (...args) =>
  execFileSync("adb", ["-s", serial, ...args], { maxBuffer: 32 * 1024 * 1024, timeout: 60000 });
const shell = (...args) =>
  adb("shell", ...args)
    .toString()
    .trim();
const dir = process.env.NATIVE_ARTIFACT_DIR ?? "artifacts/android-smoke";
fs.mkdirSync(dir, { recursive: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decode = (s) =>
  s
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
async function nodes() {
  // Android can return a null accessibility root just after launch or navigation.
  // Never read a stale dump, and retry acquisition before asserting UI content.
  let xml;
  for (let attempt = 0; attempt < 5; attempt++) {
    shell("rm", "-f", "/sdcard/finance-smoke.xml");
    const result = shell("uiautomator", "dump", "/sdcard/finance-smoke.xml");
    if (
      !result.includes("ERROR") &&
      shell(
        "test",
        "-s",
        "/sdcard/finance-smoke.xml",
        "&&",
        "echo",
        "ready",
        "||",
        "true",
      ) === "ready"
    ) {
      xml = shell("cat", "/sdcard/finance-smoke.xml");
      if (xml.includes("<hierarchy") && xml.includes("<node")) break;
    }
    xml = undefined;
    await pause(500);
  }
  assert(xml, "Android accessibility tree unavailable after 5 attempts");
  fs.writeFileSync(`${dir}/latest-ui.xml`, xml);
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)]
    .map((m) => {
      const attrs = Object.fromEntries(
        [...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [
          a[1],
          decode(a[2]),
        ]),
      );
      const rect = attrs.bounds?.match(/\d+/g)?.map(Number);
      return { ...attrs, rect };
    })
    .filter(
      (n) =>
        n.rect?.length === 4 && n.rect[2] > n.rect[0] && n.rect[3] > n.rect[1],
    );
}
let systemAnrRecoveries = 0;
async function find(label, exact = true) {
  for (let i = 0; i < 24; i++) {
    const currentNodes = await nodes();
    const anr = systemAnrWaitButton(currentNodes);
    if (anr?.rect) {
      assert(systemAnrRecoveries < 3, "Emulator remains unhealthy after three system ANRs");
      const evidence = `${dir}/system-anr-${++systemAnrRecoveries}`;
      fs.copyFileSync(`${dir}/latest-ui.xml`, `${evidence}.xml`);
      fs.writeFileSync(`${evidence}.png`, adb("exec-out", "screencap", "-p"));
      shell(
        "input",
        "tap",
        String(Math.round((anr.rect[0] + anr.rect[2]) / 2)),
        String(Math.round((anr.rect[1] + anr.rect[3]) / 2)),
      );
      await pause(600);
      continue;
    }
    const matches = currentNodes.filter((n) =>
      [n.text, n["content-desc"]].some((t) =>
        exact ? t === label : t?.includes(label),
      ),
    );
    if (matches.length)
      return matches.sort(
        (a, b) =>
          Number(b.clickable === "true") - Number(a.clickable === "true") ||
          (a.rect[2] - a.rect[0]) * (a.rect[3] - a.rect[1]) -
            (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]),
      )[0];
    await pause(500);
  }
  throw new Error(`Native control not found: ${label}`);
}
async function tap(label, exact = true) {
  const n = await find(label, exact),
    [x1, y1, x2, y2] = n.rect;
  shell(
    "input",
    "tap",
    String(Math.round((x1 + x2) / 2)),
    String(Math.round((y1 + y2) / 2)),
  );
  await pause(250);
}
async function capture(name) {
  const buffer = adb("exec-out", "screencap", "-p");
  fs.writeFileSync(`${dir}/${name}.png`, buffer);
  assert(shell("pidof", "com.aithss.finance"), "Activity process died");
  return buffer;
}
async function checkTop(theme) {
  const brand = await find("Túi Nhỏ");
  const buffer = await capture(`home-${theme}`);
  const dump = shell("dumpsys", "window");
  fs.writeFileSync(`${dir}/window-${theme}.txt`, dump);
  const frames = [
    ...dump.matchAll(/type=statusBars[^\n]*?frame=\[0,0\]\[\d+,(\d+)\]/g),
  ].map((m) => Number(m[1]));
  assert(frames.length, "Could not read dynamic Android status-bar inset");
  const statusBottom = Math.max(...frames);
  const density =
    Number(
      shell("wm", "density")
        .match(/(?:Override|Physical) density: (\d+)/g)
        ?.at(-1)
        ?.match(/\d+/)[0],
    ) / 160;
  assert(Number.isFinite(density) && density > 0, "Invalid emulator density");
  // Header content is 56 CSS px; brand must be directly below the real inset.
  assert(brand.rect[1] >= statusBottom - 2, "Header overlaps status bar");
  assert(
    brand.rect[1] - statusBottom <= 32 * density,
    "Artificial spacer above mobile header",
  );
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const palettes =
    theme === "light"
      ? [
          [247, 248, 243],
          [246, 248, 245],
        ]
      : [
          [17, 21, 19],
          [10, 14, 12],
        ];
  for (let y = 2; y < brand.rect[1]; y++) {
    // The outer page gutter must continue seamlessly, including a possible band.
    const offset = (y * info.width + Math.round(4 * density)) * info.channels;
    assert(
      palettes.some((expected) =>
        expected.every((v, c) => Math.abs(data[offset + c] - v) < 18),
      ),
      `Unexpected ${theme} band at row ${y}`,
    );
  }
  // Assert icon mode from actual Window flags, rather than infer from app theme.
  const activityWindow = dump
    .split(/Window #\d+ Window/)
    .find(
      (w) =>
        w
          .split("\n")[0]
          .includes("com.aithss.finance/com.aithss.finance.MainActivity") &&
        w.includes("mAttrs="),
    )
    ?.split("Requested w=")[0];
  assert(activityWindow, "Activity window appearance flags missing");
  assert.equal(
    activityWindow.includes("LIGHT_STATUS_BARS"),
    theme === "light",
    "Status-bar icon contrast is wrong",
  );
}
try {
  for (
    let i = 0;
    i < 180 && shell("getprop", "sys.boot_completed") !== "1";
    i++
  )
    await pause(1000);
  assert.equal(
    shell("getprop", "sys.boot_completed"),
    "1",
    "Emulator did not finish booting",
  );
  shell("settings", "put", "secure", "anr_show_background", "0");
  if (process.argv[2]) adb("install", "-r", process.argv[2]);
  shell("am", "start", "-W", "-n", "com.aithss.finance/.MainActivity");
  await find("Tổng quan");
  await capture("launch");
  await tap("Khác");
  await tap("Cài đặt");
  const settingsNodes = await nodes();
  assert(
    settingsNodes.some((n) =>
      n.text?.includes("Che số dư trên các màn hình"),
    ),
    "Privacy label 'Che số dư trên các màn hình' missing in Settings",
  );
  assert(
    !settingsNodes.some((n) => n.text === "Tiền tệ"),
    "Field 'Tiền tệ' must be removed from Settings",
  );
  assert(
    !settingsNodes.some((n) => n.text === "Ngôn ngữ"),
    "Field 'Ngôn ngữ' must be removed from Settings",
  );
  const aiSection = settingsNodes.find((n) => n.text === "Trợ lý AI");
  assert(aiSection, "Section 'Trợ lý AI' must be present in Settings");
  const dataSection = settingsNodes.find(
    (n) => n.text === "Dữ liệu của bạn",
  );
  if (dataSection) {
    assert(
      aiSection.rect[1] < dataSection.rect[1],
      "Section 'Trợ lý AI' must be positioned before 'Dữ liệu của bạn'",
    );
  }
  await tap("Giao diện");
  await tap("Tối");
  await tap("Tổng quan");
  await checkTop("dark");
  await tap("Giao dịch");
  await find("Chưa có giao dịch ở đây");
  await pause(600);
  shell("input", "keyevent", "KEYCODE_BACK");
  await pause(600);
  await find("Tổng quan");
  await tap("Khác");
  await tap("Cài đặt");
  await tap("Giao diện");
  await tap("Sáng");
  await tap("Tổng quan");
  await checkTop("light");
  await tap("Ví tiền");
  await tap("Thêm tài khoản");
  const fields = (await nodes()).filter(
    (n) => n.class === "android.widget.EditText",
  );
  assert(fields.length, "Account name input missing");
  const [x1, y1, x2, y2] = fields[0].rect;
  shell("input", "tap", String((x1 + x2) / 2), String((y1 + y2) / 2));
  shell("input", "text", "Smoke");
  shell("input", "keyevent", "KEYCODE_BACK");
  await tap("Lưu tài khoản");
  await tap("Thêm giao dịch");
  await find("Ghi một khoản mới");
  await capture("transaction-sheet");
  const amount = (await nodes()).find(
    (n) => n.class === "android.widget.EditText",
  );
  assert(amount, "Amount input missing");
  shell(
    "input",
    "tap",
    String((amount.rect[0] + amount.rect[2]) / 2),
    String((amount.rect[1] + amount.rect[3]) / 2),
  );
  shell("input", "text", "12345");
  await pause(600);
  assert(
    /mInputShown=true|isInputViewShown=true/.test(
      shell("dumpsys", "input_method"),
    ),
    "IME did not open",
  );
  let saveReachable = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await nodes();
    const web = current.find((n) => n.class === "android.webkit.WebView");
    assert(web, "Resized WebView missing with IME open");
    const save = current.find((n) => n.text === "Lưu giao dịch");
    if (save && save.rect[1] >= web.rect[1] && save.rect[3] <= web.rect[3]) {
      saveReachable = true;
      break;
    }
    const [left, top, right, bottom] = web.rect;
    const x = Math.round((left + right) / 2);
    shell(
      "input",
      "swipe",
      String(x),
      String(Math.round(top + (bottom - top) * 0.8)),
      String(x),
      String(Math.round(top + (bottom - top) * 0.3)),
      "350",
    );
    await pause(300);
  }
  assert(saveReachable, "Save is unreachable while IME is open");
  await capture("keyboard-open");
  // Close keyboard before Back reaches the unsaved sheet confirmation.
  shell("input", "keyevent", "KEYCODE_BACK");
  shell("input", "keyevent", "KEYCODE_BACK");
  await tap("OK");
  await capture("after-back");
  await tap("Tổng quan");
  shell("input", "keyevent", "KEYCODE_BACK");
  let minimized = false;
  for (let i = 0; i < 12; i++) {
    await pause(300);
    if (
      !/mCurrentFocus=.*com\.aithss\.finance/.test(shell("dumpsys", "window"))
    ) {
      minimized = true;
      break;
    }
  }
  assert(minimized, "Home Back did not minimize");
  console.log(
    "Native APK launch, themes/top inset, navigation, sheet, IME and Back smoke passed.",
  );
} catch (e) {
  await capture("failure").catch(() => {});
  fs.writeFileSync(`${dir}/logcat.txt`, adb("logcat", "-d", "-t", "1500"));
  throw e;
}
