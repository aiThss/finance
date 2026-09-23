import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const gradle = fs.readFileSync("android/app/build.gradle", "utf8");
const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
const code = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
// Android version codes are monotonic build identifiers, not semver arithmetic.
if (
  name !== pkg.version ||
  code !== pkg.androidVersionCode ||
  !Number.isInteger(code) ||
  code < 1
)
  throw new Error(
    "package.json version/androidVersionCode must match Android versionName/versionCode.",
  );
if (
  process.env.GITHUB_REF_TYPE === "tag" &&
  process.env.GITHUB_REF_NAME !== `v${pkg.version}`
)
  throw new Error("Release tag must match package.json version.");
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
if (lock.version !== pkg.version || lock.packages[""].version !== pkg.version)
  throw new Error("package-lock.json version must match package.json.");
console.log(`Version verified: ${pkg.version} (Android ${code})`);
