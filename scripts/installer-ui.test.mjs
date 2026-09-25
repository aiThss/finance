import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseUiTree, systemAnrWaitButton } from "./installer-ui.mjs";

const fixture = fs.readFileSync(new URL("./fixtures/launcher-anr.xml", import.meta.url), "utf8");
test("recognizes the actual API 35 CI Pixel Launcher obstruction", () => {
  const button = systemAnrWaitButton(parseUiTree(fixture));
  assert.equal(button["resource-id"], "android:id/aerr_wait");
  assert.equal(button.text, "Wait");
});
for (const title of ["Túi Nhỏ", "Package Installer", "Installer QA", "Unknown app"]) {
  test(`does not hide ${title} ANR`, () => {
    assert.equal(systemAnrWaitButton(parseUiTree(fixture.replace("Pixel Launcher", title))), undefined);
  });
}
test("does not treat normal installer confirmation as an ANR", () => {
  assert.equal(systemAnrWaitButton([{ package: "com.google.android.packageinstaller", text: "Install" }]), undefined);
});
test("requires the system dialog and an enabled Wait action", () => {
  assert.equal(systemAnrWaitButton(parseUiTree(fixture.replaceAll('package="android"', 'package="com.aithss.finance"'))), undefined);
  assert.equal(systemAnrWaitButton(parseUiTree(fixture.replaceAll('enabled="true"', 'enabled="false"'))), undefined);
});
