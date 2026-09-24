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

export async function downloadApk(
  url: string,
  onProgress?: (percent: number, loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Không thể tải bản cài đặt APK.");
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  if (!response.body) {
    const blob = await response.blob();
    onProgress?.(100, blob.size, blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (total > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((loaded / total) * 100)), loaded, total);
      }
    }
  }

  const blob = new Blob(chunks, {
    type: "application/vnd.android.package-archive",
  });
  if (onProgress) onProgress(100, loaded, total || loaded);
  return blob;
}

export function triggerApkInstall(blob: Blob, filename = "tui-nho.apk") {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

