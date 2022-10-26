import { test, expect } from "@playwright/test";

let baseURL = process.env.URL || "http://localhost:3000";

test.describe("example", () => {
  test("changes name on submit", async ({ page }) => {
    await page.goto(baseURL);
    await expect(
      await page.locator("h1", { hasText: "Hello, World!" })
    ).toBeVisible();

    await page.locator('input[name="name"]').fill("Test");
    await page.locator('button[type="submit"]').press("Enter");

    await expect(
      await page.locator("h1", { hasText: "Hello, Test!" })
    ).toBeVisible();
  });

  test("can navigate to the about page", async ({ page }) => {
    await page.goto(baseURL);

    await page.locator("a[href='/about']").click();

    await expect(
      await page.locator("h1", { hasText: "About Page" })
    ).toBeVisible();
  });

  test("can navigate back home", async ({ page }) => {
    await page.goto(`${baseURL}/about`);

    await page.locator("a[href='/']").click();

    await expect(
      await page.locator("h1", { hasText: "Hello, World!" })
    ).toBeVisible();
  });
});
