import { expect, test } from "./config";

test("a decimal price bound keeps its value through the URL", async ({ data, page }) => {
  const collection = data.collections.find((candidate) =>
    candidate.products.filters.some((filter) => filter.type === "PRICE_RANGE"),
  );
  test.skip(collection === undefined, "No probed collection exposes a price range filter");
  if (collection === undefined) throw new Error("No collection with a price range filter found");

  await page.goto(data.paths.collection(collection.handle));

  const minimumPrice = page
    .getByRole("spinbutton", { name: /minimum price/i })
    .filter({ visible: true })
    .first();
  expect(new URL(page.url()).searchParams.has("filter.v.price.gte")).toBe(false);
  await expect(minimumPrice).toHaveValue("");

  await minimumPrice.fill("12.5");

  await expect(page).toHaveURL(/[?&]filter\.v\.price\.gte=/);
  expect(new URL(page.url()).searchParams.get("filter.v.price.gte")).toBe("12.5");
  await expect(minimumPrice).toHaveValue("12.5");
});
