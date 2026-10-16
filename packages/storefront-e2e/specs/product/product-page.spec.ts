import { requireSignifier } from "../../src/signifiers";
import { EXPECT_TIMEOUT_MS } from "../../src/timeouts";
import { expect, test } from "./config";

test("product page loads", async ({ data, page }) => {
  const firstProduct = data.products[0];
  if (firstProduct === undefined) throw new Error("No product found");

  await page.goto(data.paths.product(firstProduct.handle));

  await expect(page.getByRole("heading", { level: 1, name: firstProduct.title })).toBeVisible();
  const quantity = await requireSignifier(page, "product-quantity");
  await expect(
    quantity,
    "product-quantity must mark a visible input, not a hidden quantity field",
  ).toBeVisible();
  await expect(quantity, "product-quantity must mark a buyer-editable input").toBeEditable();
  await expect(async () => {
    // Hydration can restore the initial value. Filling the same value is safe to retry.
    await quantity.fill("2");
    expect(await quantity.inputValue()).toBe("2");
  }).toPass({ timeout: EXPECT_TIMEOUT_MS });
});
