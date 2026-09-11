import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./config";

const MAX_ANCHOR_INSPECTION_PROBES = 200;
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
});

async function uniqueProductLinkCount(page: Page, productPathSegment: string): Promise<number> {
  const links = await visibleLinksWithPath(page, productPathSegment);
  const uniqueProductUrls = new Set(links.map((link) => new URL(link.href).pathname));
  return uniqueProductUrls.size;
}

async function applyFiltersIfNeeded(page: Page): Promise<void> {
  const applyFilters = page.getByRole("button", { name: /apply filters|show results/i }).first();
  if (await applyFilters.isVisible().catch(() => false)) await applyFilters.click();
}

async function selectFilter(filter: FilterCandidate): Promise<void> {
  const wrappingLabel = filter.control.locator("xpath=ancestor::label[1]");
  if (await wrappingLabel.isVisible().catch(() => false)) {
    await wrappingLabel.click();
    return;
  }

  await filter.control.check();
}

async function visibleLinksWithPath(page: Page, pathSegment: string): Promise<ProductCandidate[]> {
  return page.evaluate(
    ({ currentUrl, maxAnchorInspectionProbes, maxLinkDiscoveryProbes, targetPathSegment }) => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].slice(
        0,
        maxAnchorInspectionProbes,
      );
      const candidates: ProductCandidate[] = [];

      for (const link of links) {
        if (candidates.length >= maxLinkDiscoveryProbes) break;

        const url = new URL(link.href, currentUrl);
        const rect = link.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        if (!isVisible || !url.pathname.includes(targetPathSegment)) continue;

        const title = link.textContent?.replace(/\s+/g, " ").trim() ?? "";
        candidates.push({ href: url.toString(), title });
      }

      return candidates;
    },
    {
      currentUrl: page.url(),
      maxAnchorInspectionProbes: MAX_ANCHOR_INSPECTION_PROBES,
      maxLinkDiscoveryProbes: MAX_LINK_DISCOVERY_PROBES,
      targetPathSegment: pathSegment,
    },
  );
}

async function findUsableFilter(
  page: Page,
  initialResultCount: number,
): Promise<FilterCandidate | null> {
  const controls = page.getByRole("checkbox");
  const count = Math.min(await controls.count(), MAX_FILTER_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const usable = (await control.isVisible()) && (await control.isEnabled());
    if (!usable) continue;

    const label = normalizeLabel(await controlText(control));
    const candidate = { control, expectedResultCount: parseFilterCount(label), label };

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
