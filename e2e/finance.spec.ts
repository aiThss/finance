import { test, expect, type Page } from "@playwright/test";
async function account(page: Page, name: string, balance: string) {
  await page.goto("/accounts");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .first()
    .click();
  await page.getByLabel("Tên tài khoản").fill(name);
  await page.getByLabel("Số dư ban đầu (VND)").fill(balance);
  await page
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function entry(
  page: Page,
  type: "Chi tiêu" | "Thu nhập" | "Chuyển tiền",
  amount: string,
  title: string,
) {
  await page
    .getByRole("button", { name: "Thêm giao dịch", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: type, exact: true }).click();
  await page.getByRole("dialog").getByLabel("Số tiền").fill(amount);
  await page.getByLabel("Nội dung", { exact: true }).fill(title);
  if (type === "Chi tiêu")
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
  await page
    .getByRole("button", { name: "Lưu giao dịch", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("money lifecycle, budgets, recurring, restore and offline shell", async ({
  page,
  context,
}) => {
  await account(page, "Tiền mặt", "1000000");
  await account(page, "Ngân hàng", "2000000");
  await page.goto("/");
  await entry(page, "Chi tiêu", "45k", "Phở buổi trưa");
  await entry(page, "Thu nhập", "1.2m", "Lương thêm");
  await entry(page, "Chuyển tiền", "100k", "Chuyển vào ngân hàng");
  await expect(page.locator(".hero-amount")).toContainText("4.155.000");
  await page.getByRole("button", { name: /Phở buổi trưa/ }).click();
  await page.getByRole("dialog").getByLabel("Số tiền").fill("55k");
  await page
    .getByRole("button", { name: "Lưu giao dịch", exact: true })
    .click();
  await expect(page.locator(".hero-amount")).toContainText("4.145.000");
  await page.getByRole("button", { name: /Phở buổi trưa/ }).click();
  await page.getByRole("button", { name: "Xóa giao dịch" }).click();
  await expect(page.locator(".hero-amount")).toContainText("4.200.000");
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(page.locator(".hero-amount")).toContainText("4.145.000");
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Thêm ngân sách" }).click();
  await page.getByLabel("Tên ngân sách").fill("Ăn uống tháng này");
  await page.getByLabel("Hạn mức (VND)").fill("100k");
  await page
    .getByRole("combobox", { name: "Danh mục", exact: true })
    .selectOption({ label: "Ăn uống" });
  await page.getByRole("button", { name: "Lưu ngân sách" }).click();
  await expect(page.locator(".budget-card")).toContainText("55%");
  await page.goto("/recurring");
  await page.getByRole("button", { name: "Thêm lịch định kỳ" }).click();
  await page.getByLabel("Nội dung", { exact: true }).fill("Internet");
  await page.getByLabel("Số tiền (VND)").fill("200k");
  await page.getByRole("button", { name: "Lưu lịch", exact: true }).click();
  await page.getByRole("button", { name: /Xác nhận kỳ/ }).click();
  await expect(page.getByRole("button", { name: /Xác nhận kỳ/ })).toHaveCount(
    0,
  );
  await page.goto("/reports");
  await expect(
    page.getByRole("heading", { name: "Nhịp thu chi" }),
  ).toBeVisible();
  await page.goto("/settings");
  page.on("dialog", (d) => d.accept());
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sao lưu JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("dialog")).toContainText(
    "2 tài khoản · 4 giao dịch",
  );
  await page.getByLabel("Nhập THAY THẾ để xác nhận").fill("THAY THẾ");
  await page.getByRole("button", { name: "Thay thế và khôi phục" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".hero-amount")).toContainText("3.945.000");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".hero-amount")).toContainText("3.945.000");
  await entry(page, "Chi tiêu", "5k", "Gửi xe offline");
  await expect(page.locator(".hero-amount")).toContainText("3.940.000");
  await page.goto("/reports");
  await expect(
    page.getByRole("heading", { name: "Nhịp thu chi" }),
  ).toBeVisible();
});
test("mobile widths, themes and desktop have no horizontal overflow", async ({
  page,
}) => {
  await account(page, "Tiền mặt", "12500000");
  await page.goto("/");
  await entry(page, "Chi tiêu", "55k", "Bữa trưa");
  await entry(page, "Thu nhập", "2000000", "Khoản thu tháng này");
  for (const width of [320, 390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Mỗi ngày, nhẹ lòng hơn." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390 || width === 1280)
      await page.screenshot({
        path: `docs/screenshots/dashboard-${width}.png`,
        fullPage: true,
      });
  }
  await page.goto("/settings");
  await page
    .getByRole("combobox", { name: "Giao diện", exact: true })
    .selectOption("light");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 320, height: 800 });
  await page.screenshot({
    path: "docs/screenshots/dashboard-light-320.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Thêm giao dịch", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/entry-light-320.png",
    animations: "disabled",
  });
});
test("AI draft needs explicit review and save", async ({ page }) => {
  await account(page, "MoMo", "1000000");
  await page.goto("/settings");
  await page.getByRole("switch", { name: /Bật Gemini/ }).click();
  await expect(page.getByRole("switch", { name: /Bật Gemini/ })).toBeChecked();
  await page.goto("/ai");
  await page.getByRole("textbox").fill("trưa nay ăn phở 55k trả momo");
  await page.getByRole("checkbox").check();
  await page.route("**/api/ai/parse-transaction", (route) =>
    route.fulfill({
      json: {
        draft: {
          type: "expense",
          amountMinor: 55000,
          title: "Phở AI",
          suggestedCategory: "Ăn uống",
          suggestedAccount: "MoMo",
          occurredAt: new Date().toISOString(),
          confidence: 0.94,
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Gửi để tạo bản nháp" }).click();
  await expect(page.getByText("Bản nháp · chưa lưu")).toBeVisible();
  await page
    .getByRole("button", { name: "Kiểm tra & chỉnh sửa trước khi lưu" })
    .click();
  await expect(page.getByRole("dialog").getByLabel("Số tiền")).toHaveValue(
    "55000",
  );
  await page
    .getByRole("button", { name: "Lưu giao dịch", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".hero-amount")).toContainText("945.000");
});
test("discard confirmation and browser back keep unsaved forms safe", async ({
  page,
}) => {
  await account(page, "Tiền mặt", "1000000");
  await page.goto("/");
  await page
    .getByRole("button", { name: "Thêm giao dịch", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Số tiền").fill("35k");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Số tiền")).toHaveValue(
    "35k",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".hero-amount")).toContainText("1.000.000");
});
