import type { Locator, Page } from "@playwright/test";

import {
  activateProductOption,
  expectNativeProductOptionSelected,
  productOptionControlKind,
} from "../../src/product-option-control";
import { resolveProductVariantSelection } from "../../src/product-variant-selection";
import { locateSignifier, requireSignifier } from "../../src/signifiers";
import { expect, test, type ProductVariantProduct, type ProductVariantTestData } from "./config";

// A non-option query param that variant selection must keep.
const QUERY_SENTINEL_NAME = "storefront_e2e_ref";
const QUERY_SENTINEL_VALUE = "variant-check";
const ALL_CURRENT = "all current";

type Paths = ProductVariantTestData["paths"];
type VariantChoice = {
  readonly control: Locator;
  readonly optionName: string;
  readonly optionValue: string;
  readonly product: ProductVariantProduct;
  readonly productTitle: string;
};

test("product variant URL loads selected variant", async ({ data, page }) => {
  const choice = await findVariantChoice(page, data.products, data.paths);
  const beforeUrl = page.url();
  const rawHref = await choice.control.getAttribute("href");
  const href = rawHref === null ? null : new URL(rawHref, beforeUrl).href;
  await activateProductOption(choice.control);

  if (href === null) {
    await expect.poll(() => page.url()).not.toBe(beforeUrl);
    expect(
      choice.product.optionNames.some((name) => new URL(page.url()).searchParams.has(name)),
    ).toBe(true);
  } else {
    await expect.poll(() => comparableUrl(page.url())).toBe(comparableUrl(href));
  }
  expectQuerySentinel(page.url());
  const expectedVariant = await expectSelectedVariant(page, choice, href);
  const selectedVariant = { productTitle: choice.productTitle, variantUrl: page.url() };

  await page.goto(selectedVariant.variantUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: selectedVariant.productTitle }),
  ).toBeVisible();
  expectQuerySentinel(page.url());
  await expectSelectedVariant(page, choice, href, expectedVariant);
});

test.describe("without JavaScript", () => {
  test.skip(
    process.env.STOREFRONT_SKIP_NO_JS_VARIANTS === "true",
    "STOREFRONT_SKIP_NO_JS_VARIANTS=true opts this storefront out of no-JS variant selection",
  );
  test.use({ javaScriptEnabled: false });

  test("product variant link loads server-selected variant", async ({ data, page }) => {
    const variant = await findVariantChoice(page, data.products, data.paths, true);
    const rawHref = await variant.control.getAttribute("href");
    expect(rawHref).not.toBeNull();
    if (rawHref === null) throw new Error("Server variant link has no href.");
    const targetUrl = new URL(rawHref, page.url()).href;
    expect(targetUrl).not.toBe(page.url());
    await activateProductOption(variant.control);

    await expect(page).toHaveURL(targetUrl);
    expectQuerySentinel(page.url());
    await expect(page.getByRole("heading", { level: 1, name: variant.productTitle })).toBeVisible();
    await expectSelectedVariant(page, variant, targetUrl);
  });
});

async function findVariantChoice(
  page: Page,
  products: readonly ProductVariantProduct[],
  paths: Paths,
  linksOnly = false,
): Promise<VariantChoice> {
  const checkedPaths: string[] = [];
  for (const product of products) {
    const path = `${paths.product(product.handle)}?${new URLSearchParams({ [QUERY_SENTINEL_NAME]: QUERY_SENTINEL_VALUE })}`;
    checkedPaths.push(path);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: product.title })).toBeVisible();
    if ((await locateSignifier(page, "product-option-value").count()) === 0) continue;
    const selection = await selectedOptionMap(page, product);
    // Values can select a complete variant with more than one changed option.
    // Do not assume that every storefront's variant matrix is a full grid.
    const options = product.variants.flatMap((variant) => variant.selectedOptions);
    for (const option of options) {
      if (selection.get(option.name) === option.value) continue;
      const state = {
        optionName: option.name,
        optionValue: option.value,
        selected: false,
      };
      if ((await locateSignifier(page, "product-option-value", state).count()) === 0) continue;
      const control = await requireSignifier(page, "product-option-value", state);
      if (!(await control.isEnabled())) continue;
      const kind = await productOptionControlKind(control);
      if (kind === null || (linksOnly && kind !== "link")) continue;
      if (kind === "link") {
        const href = await control.getAttribute("href");
        if (href === null) continue;
        const target = new URL(href, page.url());
        if (
          target.pathname !== new URL(page.url()).pathname ||
          !product.optionNames.some((name) => target.searchParams.has(name))
        )
          continue;
      }
      return {
        control,
        optionName: option.name,
        optionValue: option.value,
        product,
        productTitle: product.title,
      };
    }
  }
  // All products were probed. Give the standard missing-signifier fix when the
  // last page has no option contract, rather than an unrelated locator timeout.
  if ((await locateSignifier(page, "product-option-value").count()) === 0) {
    await requireSignifier(page, "product-option-value");
  }
  throw new Error(
    `No product page exposed a ${linksOnly ? "server-rendered same-product link" : "supported per-value control"} to a discovered variant. Checked: ${checkedPaths.join(", ")}. Add product-option-value signifiers to links, buttons, radios, or checkboxes. Select pickers are not supported.`,
  );
}

async function expectSelectedVariant(
  page: Page,
  choice: VariantChoice,
  href: string | null,
  expectedVariant?: ProductVariantProduct["variants"][number],
): Promise<ProductVariantProduct["variants"][number]> {
  const chosen = await requireSignifier(page, "product-option-value", {
    optionName: choice.optionName,
    optionValue: choice.optionValue,
    selected: true,
  });
  await expectNativeProductOptionSelected(chosen);
  const selection = await selectedOptionMap(page, choice.product);
  const variant = resolveProductVariantSelection(choice.product, selection);
  if (expectedVariant !== undefined) expect(variant.id).toBe(expectedVariant.id);
  for (const [optionName, optionValue] of selection) {
    if (optionValue === null)
      throw new Error(`Selected option "${optionName}" has no option value attribute.`);
    const selected = await requireSignifier(page, "product-option-value", {
      optionName,
      optionValue,
      selected: true,
    });
    await expectNativeProductOptionSelected(selected);
  }
  await requireSignifier(page, "product-add-to-cart", {
    variantId: variant.id,
    available: variant.availableForSale,
  });
  if (href !== null) {
    // Retain the native link contract for all copies of the selected value that target this URL.
    await expect.poll(() => currentVariantLinksState(page, choice, href)).toBe(ALL_CURRENT);
  }
  return variant;
}

async function selectedOptionMap(
  page: Page,
  product: ProductVariantProduct,
): Promise<Map<string, string | null>> {
  const selection = new Map<string, string | null>();
  for (const optionName of product.optionNames) {
    const state = { optionName, selected: true };
    if ((await locateSignifier(page, "product-option-value", state).count()) === 0) continue;
    const selected = await requireSignifier(page, "product-option-value", state);
    selection.set(optionName, await selected.getAttribute("data-shopify-option-value"));
  }
  return selection;
}

async function currentVariantLinksState(
  page: Page,
  choice: VariantChoice,
  targetUrl: string,
): Promise<string> {
  const pageUrl = page.url();
  const expectedUrl = comparableUrl(targetUrl);
  const states = await locateSignifier(page, "product-option-value", {
    optionName: choice.optionName,
    optionValue: choice.optionValue,
  }).evaluateAll((elements) =>
    elements
      .filter((element) => element.tagName.toLowerCase() === "a")
      .map((element) => ({
        current: element.getAttribute("aria-current"),
        href: element.getAttribute("href"),
      })),
  );
  const matches = states.filter(
    (state) =>
      state.href !== null && comparableUrl(new URL(state.href, pageUrl).href) === expectedUrl,
  );
  if (matches.length === 0) return `no variant link to ${targetUrl}`;
  if (matches.every((state) => state.current === "true")) return ALL_CURRENT;
  return `aria-current values: ${matches.map((state) => String(state.current)).join(", ")}`;
}

function expectQuerySentinel(url: string): void {
  expect(
    new URL(url).searchParams.get(QUERY_SENTINEL_NAME),
    `Variant selection must keep the non-option query param ${QUERY_SENTINEL_NAME}`,
  ).toBe(QUERY_SENTINEL_VALUE);
}

/** Compares URLs without depending on query param order. */
function comparableUrl(url: string): string {
  const { origin, pathname, searchParams } = new URL(url);
  const query = [...searchParams]
    .map(([key, value]) => new URLSearchParams([[key, value]]).toString())
    .toSorted();
  return `${origin}${pathname}?${query.join("&")}`;
}
