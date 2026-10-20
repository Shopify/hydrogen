import { expect, test } from "./config";

test("product page loads", async ({ data, page }) => {
  const firstProduct = data.products[0];
  if (firstProduct === undefined) throw new Error("No product found");

  await page.goto(data.paths.product(firstProduct.handle));

  await expect(
    page
      .getByTestId("product-title")
      .filter({ hasText: firstProduct.title, visible: true })
      .first(),
  ).toBeVisible();
});
