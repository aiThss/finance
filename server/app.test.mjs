import { afterEach, describe, it, expect } from "vitest";
import { createApp } from "./app.mjs";
const servers = [];
async function start(options) {
  const server = createApp(options).listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise((r) => server.once("listening", r));
  return `http://127.0.0.1:${server.address().port}`;
}
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise((r) => s.close(r))),
  );
});
const context = {
  now: "2026-09-22T05:00:00Z",
  timezone: "Asia/Ho_Chi_Minh",
  accounts: ["MoMo"],
  categories: ["Ăn uống"],
};
const draft = {
  type: "expense",
  amountMinor: 55000,
  title: "Phở",
  suggestedCategory: "Ăn uống",
  suggestedAccount: "MoMo",
  occurredAt: "2026-09-22T05:00:00Z",
  confidence: 0.94,
};
const post = (url, body, headers = {}) =>
  fetch(url + "/api/ai/parse-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
describe("Gemini proxy contract", () => {
  it("uses structured output, low thinking, no stored conversation and validates model draft", async () => {
    let params;
    const url = await start({
      env: {},
      generate: async (p) => {
        params = p;
        return { output_text: JSON.stringify(draft) };
      },
    });
    const res = await post(url, {
      text: "trưa nay ăn phở 55k trả momo",
      context,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ draft });
    expect(params.model).toBe("gemini-3.8-flash");
    expect(params.store).toBe(false);
    expect(params.generation_config.thinking_level).toBe("low");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects invalid model output without returning it", async () => {
    const url = await start({
      env: {},
      generate: async () => ({ output_text: '{"amountMinor":-50}' }),
    });
    expect((await post(url, { text: "phở", context })).status).toBe(502);
  });
  it("rejects invalid inputs, unapproved origins and access tokens", async () => {
    const url = await start({
      env: {
        AI_ACCESS_TOKEN: "test-only-token",
        ALLOWED_ORIGINS: "https://finance.example.com",
      },
      generate: async () => ({ output_text: JSON.stringify(draft) }),
    });
    expect((await post(url, { text: "phở", context })).status).toBe(401);
    expect(
      (
        await post(
          url,
          { text: "", context },
          { Authorization: "Bearer test-only-token" },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await post(
          url,
          { text: "phở", context },
          { Origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
  });
  it("missing Gemini key does not break health endpoint", async () => {
    const url = await start({ env: {} });
    expect((await post(url, { text: "phở", context })).status).toBe(503);
    const health = await fetch(url + "/api/health");
    expect(await health.json()).toEqual({ ok: true, aiConfigured: false });
  });
  it("bounds requests per IP", async () => {
    const url = await start({
      env: {},
      generate: async () => ({ output_text: JSON.stringify(draft) }),
    });
    for (let i = 0; i < 10; i++) await post(url, { text: "phở", context });
    expect((await post(url, { text: "phở", context })).status).toBe(429);
  });
  it("sends receipt bytes only on the receipt endpoint and validates MIME", async () => {
    let params;
    const url = await start({
      env: {},
      generate: async (p) => {
        params = p;
        return { output_text: JSON.stringify(draft) };
      },
    });
    const send = (body) =>
      fetch(url + "/api/ai/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    expect(
      (await send({ image: "aGVsbG8=", mimeType: "text/html", context }))
        .status,
    ).toBe(400);
    expect(
      (await send({ image: "aGVsbG8=", mimeType: "image/png", context }))
        .status,
    ).toBe(200);
    expect(params.input[1]).toEqual({
      type: "image",
      data: "aGVsbG8=",
      mime_type: "image/png",
    });
    expect(params.input[0].text).not.toContain("aGVsbG8=");
  });
  it("insights uses medium thinking with compact deterministic totals", async () => {
    let params;
    const url = await start({
      env: {},
      generate: async (p) => {
        params = p;
        return { output_text: "Bạn chi nhiều nhất cho ăn uống." };
      },
    });
    const summary = {
      month: "2026-09",
      current: { income: 0, expense: 55000, net: -55000 },
      previous: { income: 0, expense: 0, net: 0 },
      categories: [{ name: "Ăn uống", amount: 55000 }],
      budgets: [],
    };
    const response = await fetch(url + "/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Tôi chi nhiều nhất vào đâu?",
        summary,
      }),
    });
    expect(response.status).toBe(200);
    expect(params.generation_config.thinking_level).toBe("medium");
    expect(params.store).toBe(false);
  });
});
