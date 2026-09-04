import { test, expect, setTestStore } from "../../fixtures";

setTestStore("mockShopStore");

// This smoke spec does not need the global loadtest header, and Monorail does
// not allow that custom header in browser CORS preflights.
test.use({ extraHTTPHeaders: {} });

test.describe("mock.shop store on its own host", () => {
  test("renders that store's catalog and keeps the mock.shop notice", async ({ page }) => {
    await page.goto("/");

    const notice = page.getByRole("region", { name: "Welcome to Hydrogen!" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link", { name: "mock.shop/llms.txt" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Recommended Products" }).getByRole("link").first(),
    ).toBeVisible();
  });
});
