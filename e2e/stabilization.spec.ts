import { test, expect } from "@playwright/test";
import { performanceData } from "../src/db/performance-data";
import { settingsSchema } from "../src/domain/schema";

test("settings and AI entry never read transaction history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(window, { historyReads: 0 });
    for (const prototype of [IDBObjectStore.prototype, IDBIndex.prototype]) {
      for (const name of [
        "get",
        "getAll",
        "getAllKeys",
        "getKey",
        "count",
        "openCursor",
        "openKeyCursor",
      ]) {
        const original = Reflect.get(prototype, name);
        Object.defineProperty(prototype, name, {
          configurable: true,
          writable: true,
          value: function (
            this: IDBObjectStore | IDBIndex,
            ...args: unknown[]
          ) {
            const store = "objectStore" in this ? this.objectStore : this;
            if (store.name === "transactions")
              (window as unknown as { historyReads: number }).historyReads++;
            return original.apply(this, args);
          },
        });
      }
    }
  });
  await page.goto("/settings");
  await page
    .getByRole("combobox", { name: "Giao diện", exact: true })
    .selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      () => (window as unknown as { historyReads: number }).historyReads,
    ),
  ).toBe(0);
  await page.getByRole("switch", { name: /Bật Gemini/ }).click();
  await expect(page.getByRole("switch", { name: /Bật Gemini/ })).toBeChecked();
  await page.goto("/ai");
  await page.getByRole("textbox").fill("Một bản nháp chưa cần báo cáo");
  expect(
    await page.evaluate(
      () => (window as unknown as { historyReads: number }).historyReads,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Hiểu chi tiêu", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { historyReads: number }).historyReads,
      ),
    )
    .toBeGreaterThan(0);
});

test.describe("touch choices", () => {
  test.use({ hasTouch: true, isMobile: true });
  test("taps never underline navigation, choices or native selects", async ({
    page,
  }) => {
    await page.goto("/");
    expect(
      await page.evaluate(
        () => matchMedia("(hover: none) and (pointer: coarse)").matches,
      ),
    ).toBe(true);
    const nav = page.locator(".bottom-nav");
    for (const label of ["Tổng quan", "Giao dịch", "Ví tiền", "Khác"]) {
      const control = nav.getByRole("link", { name: label, exact: true });
      await control.tap();
      await expect(control).toHaveCSS("text-decoration-line", "none");
    }
    const settings = page.getByRole("link", { name: /Cài đặt/ });
    await settings.tap();
    await page
      .getByRole("combobox", { name: "Giao diện", exact: true })
      .selectOption("light");
    await expect(
      page.getByRole("combobox", { name: "Giao diện", exact: true }),
    ).toHaveCSS("appearance", "none");
    await nav.getByRole("link", { name: "Ví tiền", exact: true }).tap();
    await page
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .first()
      .tap();
    await page.getByLabel("Tên tài khoản").fill("Ví cảm ứng");
    await page.getByLabel("Số dư ban đầu (VND)").fill("1000000");
    await page
      .getByRole("button", { name: "Lưu tài khoản", exact: true })
      .tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Thêm giao dịch", exact: true })
      .tap();
    for (const label of ["Thu nhập", "Chi tiêu"]) {
      const control = page.getByRole("button", { name: label, exact: true });
      await control.tap();
      await expect(control).toHaveCSS("text-decoration-line", "none");
    }
    const category = page.getByRole("button", { name: "Ăn uống", exact: true });
    await category.tap();
    await expect(category).toHaveCSS("text-decoration-line", "none");
    const account = page.getByRole("combobox", {
      name: "Tài khoản",
      exact: true,
    });
    await account.selectOption({ label: "Ví cảm ứng" });
    await expect(account).toHaveCSS("text-decoration-line", "none");
    await expect(account).toHaveCSS("appearance", "none");
    await expect(nav).toHaveCSS("backdrop-filter", "none");
  });
});

test("desktop links retain keyboard focus and hover affordance", async ({
  page,
}) => {
  await page.goto("/more");
  expect(
    await page.evaluate(
      () => matchMedia("(hover: hover) and (pointer: fine)").matches,
    ),
  ).toBe(true);
  await page.locator(".more-row").first().hover();
  await expect(page.locator(".more-row").first()).toHaveCSS(
    "text-decoration-line",
    "none",
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toHaveCSS(
    "outline-style",
    "solid",
  );
});

for (const [width, height] of [
  [320, 560],
  [360, 740],
  [390, 844],
  [412, 915],
]) {
  test(`sheet remains reachable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/accounts");
    await page
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .first()
      .click();
    await page.getByLabel("Tên tài khoản").fill("Ví thử");
    await page
      .getByRole("button", { name: "Lưu tài khoản", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Thêm giao dịch", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    for (const control of [
      dialog.getByLabel("Số tiền"),
      dialog.getByRole("combobox"),
      dialog.getByRole("button", { name: "Ăn uống", exact: true }),
      dialog.getByRole("button", { name: "Lưu giao dịch", exact: true }),
    ]) {
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport();
      await expect(
        dialog.getByRole("button", { name: "Đóng", exact: true }),
      ).toBeInViewport();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const count of [1000, 5000, 10000]) {
  test(`history responsiveness with ${count} transactions`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    await page.goto("/settings");
    const backup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...performanceData(count),
      categories: [],
      budgets: [],
      recurring: [],
      settings: settingsSchema.parse({}),
    };
    await page.locator("input[type=file]").setInputFiles({
      name: "synthetic.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page.getByLabel("Nhập THAY THẾ để xác nhận").fill("THAY THẾ");
    await page.getByRole("button", { name: "Thay thế và khôi phục" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const metrics: Record<string, number> = {};
    const nav = page.locator(".bottom-nav");
    let start = performance.now();
    await nav.getByRole("link", { name: "Tổng quan", exact: true }).click();
    await expect(page.locator(".hero-amount")).toBeVisible();
    metrics.homeMs = performance.now() - start;
    start = performance.now();
    await page
      .getByRole("button", { name: "Thêm giao dịch", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    metrics.addMs = performance.now() - start;
    await page.getByRole("dialog").getByLabel("Số tiền").fill("1000");
    await page
      .getByLabel("Nội dung", { exact: true })
      .fill("Giao dịch đo hiệu năng");
    start = performance.now();
    await page
      .getByRole("button", { name: "Lưu giao dịch", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    metrics.saveMs = performance.now() - start;
    start = performance.now();
    await nav.getByRole("link", { name: "Giao dịch", exact: true }).click();
    await expect(page.locator(".transaction-row").first()).toBeVisible();
    expect(await page.locator(".transaction-row").count()).toBeLessThanOrEqual(
      60,
    );
    metrics.transactionsMs = performance.now() - start;
    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect(page.locator(".transaction-row").first()).toBeVisible();
    await nav.getByRole("link", { name: "Khác", exact: true }).click();
    start = performance.now();
    await page.getByRole("link", { name: /Báo cáo Một bức tranh/ }).click();
    await expect(
      page.getByRole("heading", { name: "Nhịp thu chi" }),
    ).toBeVisible();
    metrics.reportsMs = performance.now() - start;
    await testInfo.attach(`performance-${count}`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    console.info(JSON.stringify({ count, ...metrics }));
    for (const ms of Object.values(metrics)) expect(ms).toBeLessThan(4000);
  });
}
