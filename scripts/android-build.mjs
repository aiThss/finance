import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  ["assembleDebug"],
  { cwd: "android", stdio: "inherit", shell: process.platform === "win32" },
);
if (result.error)
  console.error(
    "Install Android SDK and JDK 21; set ANDROID_HOME and JAVA_HOME.",
  );
process.exit(result.status ?? 1);
