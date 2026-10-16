import type { Locator, Page } from "@playwright/test";

import {
  getNarrowingFilterValues,
  renderedProductCardCount,
  requireActionableCollectionFilter,
} from "../../src/collection-results";
import { requireSignifier } from "../../src/signifiers";
import { expect, test } from "./config";

test("collection filter narrows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No filterable collection found");
  const firstProduct = firstCollection.products.nodes[0];
  if (firstProduct === undefined) throw new Error("No collection product found");

  await page.goto(data.paths.collection(firstCollection.handle));
  const firstCard = await requireSignifier(page, "product-card", {
    productHandle: firstProduct.handle,
  });
  await expect(firstCard).toBeVisible();

  const initialResultCount = await renderedProductCardCount(page);
  const values = getNarrowingFilterValues(firstCollection.products.filters, initialResultCount);
  test.skip(
    values.length === 0,
    "No Storefront API filter value narrows the rendered product cards",
  );
  const filter = await requireActionableCollectionFilter(page, values, filterActionTarget);
  await expect(filter.control).toHaveAttribute("type", "checkbox");
  await expect(filter.control).toBeEnabled();
  await expect(filter.control).not.toBeChecked();

  const beforeUrl = page.url();
  if (filter.actionTarget === filter.control) await filter.control.check();
  else await filter.actionTarget.click();
  await expect(filter.control).toBeChecked();

  await applyFiltersIfNeeded(page);
  await expect(page).not.toHaveURL(beforeUrl);
  await expect
    .poll(async () => {
      const resultCount = await renderedProductCardCount(page);
      return (
        resultCount > 0 && resultCount < initialResultCount && resultCount <= filter.value.count
      );
    })
    .toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(beforeUrl);
  // The locator keeps the Storefront API value ID across navigation.
  await expect(filter.control).not.toBeChecked();
  await expect.poll(() => renderedProductCardCount(page)).toBe(initialResultCount);
});

async function applyFiltersIfNeeded(page: Page): Promise<void> {
  const applyFilters = page.getByRole("button", { name: /apply filters|show results/i }).first();
  if (await applyFilters.isVisible().catch(() => false)) await applyFilters.click();
}

async function filterActionTarget(filter: { control: Locator }): Promise<Locator> {
  const wrappingLabel = filter.control.locator("xpath=ancestor::label[1]");
  return (await wrappingLabel.isVisible().catch(() => false)) ? wrappingLabel : filter.control;
}
