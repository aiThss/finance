// Public backend location only; provider credentials never enter the bundle.
export function normalizeApiBase(value: string | undefined, native: boolean) {
  const base = value?.trim().replace(/\/+$/, "") ?? "";
  if (!base && !native) return "";
  try {
    const url = new URL(base);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return base;
  } catch {
    throw new Error(
      "Backend AI chưa được cấu hình đúng. Bản Android cần URL HTTPS; bạn vẫn có thể ghi thu chi thủ công.",
    );
  }
}
