import { expect, test } from "./config";

test("collection page shows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No collection with products found");

  const firstProduct = firstCollection.products.nodes[0];
  if (firstProduct === undefined) throw new Error("No collection product found");

  await page.goto(data.paths.collection(firstCollection.handle));

  await expect(
    page.getByRole("link", { name: new RegExp(escapeRegExp(firstProduct.title), "i") }).first(),
  ).toBeVisible();
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
