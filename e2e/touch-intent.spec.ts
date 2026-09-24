import { test, expect, type Locator } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

async function swipeClick(control: Locator, cancelled = false) {
  // Reproduce WebView's compatibility click even when the swipe stays inside
  // a large control. Real scroll input is covered separately below.
  await control.evaluate((element, cancelled) => {
    const data = {
      bubbles: true,
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      clientX: 100,
      clientY: 100,
    };
    element.dispatchEvent(new PointerEvent("pointerdown", data));
    element.dispatchEvent(
      new PointerEvent("pointermove", { ...data, clientY: 115 }),
    );
    element.dispatchEvent(
      new PointerEvent(cancelled ? "pointercancel" : "pointerup", {
        ...data,
        clientY: 115,
      }),
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
    );
  }, cancelled);
}

test("swipes do not activate buttons, pickers or options; deliberate taps and keyboard still work", async ({
  page,
}) => {
  await page.goto("/settings");
  const select = page.getByRole("combobox", { name: "Giao diện", exact: true });
  const trigger = select.locator("..");
  await swipeClick(trigger);
  await expect(page.locator(".select-sheet-content")).toHaveCount(0);
  await swipeClick(trigger, true);
  await expect(page.locator(".select-sheet-content")).toHaveCount(0);
  await trigger.tap();
  const options = page
    .getByRole("option", { name: "Sáng", exact: true })
    .filter({ visible: true });
  await swipeClick(options);
  await expect(page.locator(".select-sheet-content")).toBeVisible();
  await options.tap();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".select-sheet-content")).toHaveCount(0);
  await select.focus();
  await select.press("Enter");
  await expect(page.locator(".select-sheet-content")).toBeVisible();
  await page.keyboard.press("Escape");
  const toggle = page.getByRole("switch", { name: /Bật Gemini/ });
  await swipeClick(toggle);
  await expect(toggle).not.toBeChecked();
  await toggle.tap();
  await expect(toggle).toBeChecked();
  await page.screenshot({ path: "artifacts/touch-settings-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "artifacts/touch-settings-desktop.png" });
});

test("a real Chromium touch swipe beginning on a picker scrolls instead of opening it", async ({
  page,
}) => {
  await page.goto("/settings");
  const trigger = page
    .getByRole("combobox", { name: "Giao diện", exact: true })
    .locator("..");
  await trigger.scrollIntoViewIfNeeded();
  const box = (await trigger.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = await page.evaluate(() => window.scrollY);
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let distance = 15; distance <= 90; distance += 15) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - distance }],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".select-sheet-content")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(before);
  await session.detach();
});
