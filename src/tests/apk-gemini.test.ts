import { describe, expect, it, afterEach } from "vitest";
import { newerVersion, parseRelease } from "../lib/apk-updates";
import { interactionBody, parseInteraction } from "../features/ai/api/direct";
import {
  saveLocalKey,
  hasLocalKey,
  removeLocalKey,
  GEMINI_MODEL,
  geminiError,
} from "../features/ai/api/local-key";
describe("official APK updates", () => {
  it("compares numeric versions and never offers a downgrade", () => {
    expect(newerVersion("v1.10.0", "1.9.9")).toBe(true);
    expect(newerVersion("v1.0.2", "1.0.2")).toBe(false);
    expect(newerVersion("v1.0.1", "1.0.2")).toBe(false);
  });
  it("accepts only a stable release with the official repository APK", () => {
    const release = {
      tag_name: "v1.0.3",
      draft: false,
      prerelease: false,
      assets: [
        {
          name: "tui-nho.apk",
          state: "uploaded",
          browser_download_url:
            "https://github.com/aiThss/finance/releases/download/v1.0.3/tui-nho.apk",
        },
      ],
    };
    expect(parseRelease(release, "1.0.2").available).toBe(true);
    expect(() =>
      parseRelease({ ...release, prerelease: true }, "1.0.2"),
    ).toThrow();
    expect(() =>
      parseRelease(
        {
          ...release,
          assets: [
            {
              ...release.assets[0],
              browser_download_url: "https://example.com/fake.apk",
            },
          ],
        },
        "1.0.2",
      ),
    ).toThrow();
    expect(() => parseRelease({ ...release, assets: [] }, "1.0.2")).toThrow();
  });
});
describe("personal Gemini key and output", () => {
  afterEach(async () => {
    await removeLocalKey();
  });
  it("accepts long opaque auth keys with dots without weakening whitespace validation", async () => {
    await saveLocalKey(`  AQ.${"test-only_".repeat(60)}.signature==  `);
    expect(await hasLocalKey()).toBe(true);
    for (const key of [
      "short",
      "AQ.invalid key with spaces",
      `AQ.${"x".repeat(4096)}`,
      "AQ.invalid\r\nheader-injection",
    ]) {
      await expect(saveLocalKey(key)).rejects.toThrow();
    }
  });
  it("uses the high-throughput model and distinguishes permission, model and quota errors", () => {
    expect(
      interactionBody("parse-transaction", { text: "phở 55k" }).model,
    ).toBe(GEMINI_MODEL);
    expect(GEMINI_MODEL).toBe("gemini-3.5-flash-lite");
    expect(geminiError(403).message).toContain("quyền");
    expect(geminiError(404).message).toContain("Model");
    expect(geminiError(429).message).toContain("hạn mức");
    expect(geminiError(400).message).not.toContain("Key không hợp lệ");
  });
  it("keeps web credentials out of persistent storage", async () => {
    await saveLocalKey("test-only-personal-key-1234567890");
    expect(await hasLocalKey()).toBe(true);
    await removeLocalKey();
    expect(await hasLocalKey()).toBe(false);
  });
  it("opts out of interaction storage and validates finance output", () => {
    expect(
      interactionBody("parse-transaction", { text: "phở 55k" }).store,
    ).toBe(false);
    const draft = {
      type: "expense",
      amountMinor: 55000,
      title: "Phở",
      suggestedCategory: null,
      suggestedAccount: null,
      occurredAt: "2026-09-24T00:00:00+07:00",
      confidence: 0.9,
    };
    const result = (value: unknown) => ({
      status: "completed",
      steps: [
        { type: "thought", content: [{ type: "text", text: "ignore" }] },
        {
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify(value) }],
        },
      ],
    });
    expect(parseInteraction("parse-transaction", result(draft))).toEqual(draft);
    expect(() =>
      parseInteraction(
        "parse-transaction",
        result({ ...draft, amountMinor: -1 }),
      ),
    ).toThrow();
    expect(() =>
      parseInteraction("insights", { status: "failed", steps: [] }),
    ).toThrow();
  });
});
