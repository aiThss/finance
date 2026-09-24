import { test, expect } from "@playwright/test";

test("APK check offers official newer download, latest and network recovery", async ({
  page,
}) => {
  let version = "99.0.0";
  await page.route(
    "https://api.github.com/repos/aiThss/finance/releases/latest",
    (route) =>
      route.fulfill({
        json: {
          tag_name: `v${version}`,
          draft: false,
          prerelease: false,
          assets: [
            {
              name: "tui-nho.apk",
              state: "uploaded",
              browser_download_url: `https://github.com/aiThss/finance/releases/download/v${version}/tui-nho.apk`,
            },
          ],
        },
      }),
  );
  await page.goto("/settings");
  await page.getByRole("button", { name: "Kiểm tra cập nhật APK" }).click();
  await page.route(
    "https://github.com/aiThss/finance/releases/download/**",
    (route) =>
      route.fulfill({
        contentType: "application/vnd.android.package-archive",
        headers: {
          "content-disposition": 'attachment; filename="tui-nho.apk"',
        },
        body: "test APK",
      }),
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải APK 99.0.0" }).click();
  const download = await downloadEvent;
  expect(download.url()).toBe(
    "https://github.com/aiThss/finance/releases/download/v99.0.0/tui-nho.apk",
  );
  expect(page.context().pages()).toHaveLength(1);
  await expect(
    page.getByText("Đã gửi yêu cầu tải APK.", { exact: true }),
  ).toBeVisible();
  version = "1.0.0";
  await page.getByRole("button", { name: "Kiểm tra cập nhật APK" }).click();
  await expect(
    page.getByText("Bạn đang dùng phiên bản mới nhất."),
  ).toBeVisible();
  await page.unrouteAll();
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.getByRole("button", { name: "Kiểm tra cập nhật APK" }).click();
  await expect(
    page.getByText("Không kết nối được GitHub. Kiểm tra mạng và thử lại."),
  ).toBeVisible();
});

test("personal key goes directly to Google, clears after reload, and is removable", async ({
  page,
}) => {
  const key = `AQ.${"test-only-key_".repeat(40)}.signature==`;
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      expect(route.request().headers()["x-goog-api-key"]).toBe(key);
      expect(route.request().url()).not.toContain(key);
      expect(route.request().url()).toContain("models/gemini-3.5-flash-lite");
      await route.fulfill({ json: { name: "models/gemini-3.5-flash-lite" } });
    },
  );
  await page.goto("/settings");
  await page.getByLabel("Gemini API key", { exact: true }).fill(key);
  await page.getByRole("button", { name: "Lưu API key" }).click();
  await expect(page.getByLabel("Gemini API key", { exact: true })).toHaveValue(
    "",
  );
  expect(
    await page.evaluate(() => JSON.stringify([localStorage, sessionStorage])),
  ).not.toContain(key);
  await page.getByRole("button", { name: "Kiểm tra key Gemini" }).click();
  await expect(page.getByText(/Key hợp lệ, đã kết nối/)).toBeVisible();
  await page.getByRole("button", { name: "Xóa API key" }).click();
  await expect(
    page.getByRole("button", { name: "Kiểm tra key Gemini" }),
  ).toBeDisabled();
  await page.getByLabel("Gemini API key", { exact: true }).fill(key);
  await page.getByRole("button", { name: "Lưu API key" }).click();
  await expect(
    page.getByText("Đã lưu key. Bạn có thể kiểm tra kết nối."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Kiểm tra key Gemini" }),
  ).toBeDisabled();
});

test("personal Gemini creates only a reviewed draft and never calls the proxy", async ({
  page,
}) => {
  await page.route("**/api/ai/**", () => {
    throw new Error("Personal key must not use the proxy");
  });
  await page.route(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    (route) => {
      expect(route.request().postDataJSON().store).toBe(false);
      expect(route.request().postDataJSON().model).toBe(
        "gemini-3.5-flash-lite",
      );
      return route.fulfill({
        json: {
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    type: "expense",
                    amountMinor: 55000,
                    title: "Phở key riêng",
                    suggestedCategory: null,
                    suggestedAccount: null,
                    occurredAt: new Date().toISOString(),
                    confidence: 0.9,
                  }),
                },
              ],
            },
          ],
        },
      });
    },
  );
  await page.goto("/settings");
  await page
    .getByLabel("Gemini API key", { exact: true })
    .fill("test-only-personal-key-1234567890");
  await page.getByRole("button", { name: "Lưu API key" }).click();
  await expect(
    page.getByText("Đã lưu key. Bạn có thể kiểm tra kết nối."),
  ).toBeVisible();
  await page.getByRole("switch", { name: /Bật Gemini/ }).click();
  await expect(page.getByRole("switch", { name: /Bật Gemini/ })).toBeChecked();
  await page.getByRole("link", { name: "Khác", exact: true }).click();
  await page.getByText("Công cụ khác", { exact: true }).click();
  await page.getByRole("link", { name: /Trợ lý AI/ }).click();
  await page.getByRole("textbox").fill("phở 55k");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Gửi để tạo bản nháp" }).click();
  await expect(page.getByText("Bản nháp · chưa lưu")).toBeVisible();
  await expect(page.getByText("Phở key riêng", { exact: true })).toBeVisible();
});
