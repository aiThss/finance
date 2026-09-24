import { test, expect } from "@playwright/test";

test("time wheels stage changes, scroll, cancel, and preserve the transaction on Back", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .first()
    .click();
  await page.getByLabel("Tên tài khoản").fill("Ví thử giờ");
  await page.getByLabel("Số dư ban đầu (VND)").fill("1000000");
  await page
    .getByRole("button", { name: "Lưu tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thêm giao dịch", exact: true })
    .last()
    .click();
  await page.getByLabel("Số tiền", { exact: true }).fill("50000");
  await page.getByRole("button", { name: /Thời gian giao dịch:/ }).click();
  const original = await page.locator('input[name="date"]').inputValue();
  const trigger = page.getByRole("button", { name: /^Chọn giờ,/ });
  await trigger.click();
  const picker = page.getByRole("dialog", { name: "Chọn giờ", exact: true });
  const hours = picker.getByRole("spinbutton", { name: "Giờ", exact: true });
  const minutes = picker.getByRole("spinbutton", { name: "Phút", exact: true });
  await hours.press("End");
  await minutes.press("End");
  await expect(hours).toHaveAttribute("aria-valuenow", "23");
  await expect(minutes).toHaveAttribute("aria-valuenow", "59");
  await expect(page.locator('input[name="date"]')).toHaveValue(original);
  await picker.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await hours.evaluate((el) => el.scrollTo({ top: 9 * 44 }));
  await minutes.evaluate((el) => el.scrollTo({ top: 25 * 44 }));
  await expect(hours).toHaveAttribute("aria-valuenow", "9");
  await expect(minutes).toHaveAttribute("aria-valuenow", "25");
  for (const [width, theme] of [
    [320, "light"],
    [390, "dark"],
    [1280, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 740 });
    await page.evaluate(
      (theme) => document.documentElement.setAttribute("data-theme", theme),
      theme,
    );
    const bounds = await picker.boundingBox();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(
      await picker.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/time-wheel-${width}-${theme}.png`,
    });
  }
  await picker.getByRole("button", { name: "Xong", exact: true }).click();
  await expect(page.locator('input[name="date"]')).toHaveValue(
    original.slice(0, 11) + "09:25",
  );
  await trigger.click();
  await hours.press("Escape");
  await expect(picker).toHaveCount(0);
  await trigger.click();
  await page.goBack();
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Ghi một khoản mới" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lưu giao dịch", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
