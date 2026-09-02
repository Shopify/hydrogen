import type { Locator, Page } from "@playwright/test";

import { expect, test, type ProductVariantProduct, type ProductVariantTestData } from "./config";

const MAX_VARIANT_CONTROL_PROBES = 30;

type Paths = ProductVariantTestData["paths"];

type SelectedVariant = {
  readonly productTitle: string;
  readonly variantLabel: string;
  readonly variantUrl: string;
};

test("product variant selection updates URL", async ({ data, page }) => {
  await selectProductVariant(page, data.products, data.paths);
});

test("product variant URL loads selected variant", async ({ data, page }) => {
  const selectedVariant = await selectProductVariant(page, data.products, data.paths);

  await page.goto(selectedVariant.variantUrl);

  await expect(
    page.getByRole("heading", { level: 1, name: selectedVariant.productTitle }),
  ).toBeVisible();
  await expect(
    page.getByText(selectedVariant.variantLabel, { exact: false }).first(),
  ).toBeVisible();
});

async function selectProductVariant(
  page: Page,
  products: readonly ProductVariantProduct[],
  paths: Paths,
): Promise<SelectedVariant> {
  for (const product of products) {
    const selectedVariant = await selectVariantForProduct(page, product, paths);
    if (selectedVariant !== null) return selectedVariant;
  }

  throw new Error("No product page exposed a selectable variant control");
}

async function selectVariantForProduct(
  page: Page,
  product: ProductVariantProduct,
  paths: Paths,
): Promise<SelectedVariant | null> {
  await page.goto(paths.product(product.handle));
  await expect(page.getByRole("heading", { level: 1, name: product.title })).toBeVisible();

  const control = await findVariantControl(page, product.optionNames);
  if (control === null) return null;

  const variantLabel = normalizeLabel(await controlText(control));
  const beforeUrl = page.url();
  await control.click();

  await expect.poll(() => page.url()).not.toBe(beforeUrl);
  expect(hasVariantUrlSignal(beforeUrl, page.url())).toBe(true);
  await expect(page.getByText(variantLabel, { exact: false }).first()).toBeVisible();

  return { productTitle: product.title, variantLabel, variantUrl: page.url() };
}

function hasVariantUrlSignal(beforeUrl: string, afterUrl: string): boolean {
  const before = new URL(beforeUrl);
  const after = new URL(afterUrl);
  return before.pathname !== after.pathname || after.searchParams.size > 0;
}

async function findVariantControl(
  page: Page,
  optionNames: readonly string[],
): Promise<Locator | null> {
  const link = await findVariantLink(page, optionNames);
  if (link !== null) return link;

  return findUnselectedVariantButton(page);
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

async function findUnselectedVariantButton(page: Page): Promise<Locator | null> {
  const buttons = page.getByRole("button");
  const count = Math.min(await buttons.count(), MAX_VARIANT_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const pressed = await button.getAttribute("aria-pressed");
    const usable = pressed === "false" && (await button.isVisible()) && (await button.isEnabled());
    if (usable) return button;
  }

  return null;
}

async function findVariantLink(
  page: Page,
  optionNames: readonly string[],
): Promise<Locator | null> {
  const links = page.getByRole("link");
  const count = Math.min(await links.count(), MAX_VARIANT_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    if (await isCurrentLink(link)) continue;

    const href = await link.getAttribute("href");
    if (!isVariantHref(href, page.url(), optionNames)) continue;
    if (await link.isVisible()) return link;
  }

  return null;
}

async function isCurrentLink(link: Locator): Promise<boolean> {
  const ariaCurrent = await link.getAttribute("aria-current");
  return ariaCurrent !== null && ariaCurrent !== "false";
}

function isVariantHref(
  href: string | null,
  currentUrl: string,
  optionNames: readonly string[],
): boolean {
  if (href === null) return false;

  const current = new URL(currentUrl);
  const url = new URL(href, currentUrl);
  return (
    url.pathname === current.pathname && optionNames.some((name) => url.searchParams.has(name))
  );
}
