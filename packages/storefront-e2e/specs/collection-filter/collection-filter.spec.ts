import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./config";

const MAX_FILTER_CONTROL_PROBES = 20;
const MAX_LINK_DISCOVERY_PROBES = 40;

type ProductCandidate = {
  readonly href: string;
  readonly title: string;
};

type FilterCandidate = {
  readonly control: Locator;
  readonly expectedResultCount: number | null;
  readonly label: string;
  readonly labelElement: Locator;
};

test("collection filter narrows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No filterable collection found");

  await page.goto(data.paths.collection(firstCollection.handle));

  const initialResultCount = await uniqueProductLinkCount(page, data.paths.product);
  const filter = await findUsableFilter(page, initialResultCount);
  test.skip(filter === null, "No visible collection filter narrows the initial product results");

  if (filter === null) throw new Error("No usable collection filter found");

  const beforeUrl = page.url();
  await selectFilter(filter);
  await expect(filter.control).toBeChecked();

  await applyFiltersIfNeeded(page);
  await expect(page).not.toHaveURL(beforeUrl);
  await expect
    .poll(async () => {
      const resultCount = await uniqueProductLinkCount(page, data.paths.product);
      return resultCount > 0 && resultCount < initialResultCount;
    })
    .toBe(true);

  const resultCount = await uniqueProductLinkCount(page, data.paths.product);
  if (filter.expectedResultCount !== null) {
    expect(resultCount).toBeLessThanOrEqual(filter.expectedResultCount);
  }

  await page.goBack();
  await expect(page).toHaveURL(beforeUrl);
  // Confirm the positional locator still points at the same filter before checking its state.
  await expect
    .poll(async () => normalizeLabel(await controlText(filter.control)))
    .toBe(filter.label);
  await expect(filter.control).not.toBeChecked();
});

async function uniqueProductLinkCount(page: Page, productPathSegment: string): Promise<number> {
  const links = await visibleLinksWithPath(page, productPathSegment);
  const uniqueProductUrls = new Set(links.map((link) => new URL(link.href).pathname));
  return uniqueProductUrls.size;
}

async function applyFiltersIfNeeded(page: Page): Promise<void> {
  const applyFilters = page
    .getByTestId("collection-filter-apply")
    .filter({ visible: true })
    .first();
  if (await applyFilters.isVisible().catch(() => false)) await applyFilters.click();
}

async function selectFilter(filter: FilterCandidate): Promise<void> {
  if (await filter.labelElement.isVisible().catch(() => false)) {
    await filter.labelElement.click();
    return;
  }

  await filter.control.check();
}

async function visibleLinksWithPath(page: Page, pathSegment: string): Promise<ProductCandidate[]> {
  const cards = page
    .getByTestId("product-results")
    .filter({ visible: true })
    .first()
    .getByTestId("product-card")
    .filter({ visible: true });
  const links = await cards.evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute("href"),
      title: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    })),
  );
  const candidates: ProductCandidate[] = [];

  for (const { href, title } of links) {
    if (candidates.length >= MAX_LINK_DISCOVERY_PROBES) break;
    if (href === null) continue;

    const url = new URL(href, page.url());
    if (!url.pathname.includes(pathSegment)) continue;

    candidates.push({ href: url.toString(), title });
  }

  return candidates;
}

async function findUsableFilter(
  page: Page,
  initialResultCount: number,
): Promise<FilterCandidate | null> {
  const labels = page.getByTestId("collection-filter-label").filter({ visible: true });
  const count = Math.min(await labels.count(), MAX_FILTER_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const labelElement = labels.nth(index);
    const control = labelElement.getByTestId("collection-filter-value").first();
    const usable = (await control.isVisible()) && (await control.isEnabled());
    if (!usable) continue;

    const label = normalizeLabel(await controlText(control));
    const candidate = {
      control,
      expectedResultCount: parseFilterCount(label),
      label,
      labelElement,
    };

    if (candidate.expectedResultCount === null) continue;
    if (candidate.expectedResultCount > 0 && candidate.expectedResultCount < initialResultCount) {
      return candidate;
    }
  }

  return null;
}

async function controlText(control: Locator): Promise<string> {
  const ariaLabel = await control.getAttribute("aria-label");
  if (ariaLabel !== null && ariaLabel.trim() !== "") return ariaLabel;

  return control.evaluate((element) => {
    if (element instanceof HTMLInputElement)
      return element.labels?.[0]?.textContent ?? element.value;

    return element.textContent ?? "";
  });
}

function normalizeLabel(value: string | null): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/ - Sold out$/i, "")
    .trim();
}

function parseFilterCount(label: string): number | null {
  const match = label.match(/\((\d+)\)/);
  if (match === null) return null;

  const count = Number.parseInt(match[1], 10);
  return Number.isFinite(count) ? count : null;
}
