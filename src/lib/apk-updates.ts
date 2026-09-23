import { z } from "zod";

export const releasesUrl = "https://github.com/aiThss/finance/releases/latest";
const releaseSchema = z.object({
  tag_name: z.string().regex(/^v?\d+\.\d+\.\d+$/),
  draft: z.literal(false),
  prerelease: z.literal(false),
  assets: z.array(
    z.object({
      name: z.string(),
      browser_download_url: z.string().url(),
      state: z.string(),
    }),
  ),
});
export function newerVersion(remote: string, current: string) {
  const parse = (v: string) => {
    if (!/^v?\d+\.\d+\.\d+$/.test(v))
      throw new Error("Phiên bản không hợp lệ.");
    return v.replace(/^v/, "").split(".").map(BigInt);
  };
  const a = parse(remote),
    b = parse(current);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export function parseRelease(data: unknown, current: string) {
  const release = releaseSchema.parse(data);
  const apk = release.assets.find(
    (a) => a.name === "tui-nho.apk" && a.state === "uploaded",
  );
  const expected = `https://github.com/aiThss/finance/releases/download/${release.tag_name}/tui-nho.apk`;
  if (!apk || apk.browser_download_url !== expected)
    throw new Error("Bản phát hành chưa có APK chính thức. Hãy thử lại sau.");
  return {
    version: release.tag_name.replace(/^v/, ""),
    available: newerVersion(release.tag_name, current),
    url: expected,
  };
}
export async function checkApkUpdate(current: string) {
  if (!navigator.onLine)
    throw new Error("Bạn đang ngoại tuyến. Kết nối mạng rồi kiểm tra lại.");
  const response = await fetch(
    "https://api.github.com/repos/aiThss/finance/releases/latest",
    {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 403 || response.status === 429)
    throw new Error(
      "GitHub đang giới hạn lượt kiểm tra. Thử lại sau hoặc mở trang phát hành.",
    );
  if (!response.ok)
    throw new Error(
      "Chưa kiểm tra được bản mới. Thử lại sau hoặc mở trang phát hành.",
    );
  return parseRelease(await response.json(), current);
}
