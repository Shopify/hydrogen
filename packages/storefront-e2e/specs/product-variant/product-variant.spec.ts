import type { Locator, Page } from "@playwright/test";

import { expect, test, type ProductVariantProduct, type ProductVariantTestData } from "./config";

const MAX_VARIANT_CONTROL_PROBES = 30;

// A non-option query param that variant selection must keep.
const QUERY_SENTINEL_NAME = "storefront_e2e_ref";
const QUERY_SENTINEL_VALUE = "variant-check";

// The success state of currentVariantLinksState.
const ALL_CURRENT = "all current";

type Paths = ProductVariantTestData["paths"];

type SelectedVariant = {
  /** The clicked link's resolved href URL, or null when the control is a button. */
  readonly href: string | null;
  readonly name: string;
  readonly productTitle: string;
  readonly variantUrl: string;
};

type ServerVariantLink = {
  readonly link: Locator;
  readonly linkName: string;
  readonly productTitle: string;
  readonly targetUrl: string;
};

test("product variant URL loads selected variant", async ({ data, page }) => {
  const selectedVariant = await selectProductVariant(page, data.products, data.paths);

  await page.goto(selectedVariant.variantUrl);

  await expect(
    page.getByRole("heading", { level: 1, name: selectedVariant.productTitle }),
  ).toBeVisible();
  expectQuerySentinel(page.url());
  await expectSelectedControl(page, selectedVariant);
});

test.describe("without JavaScript", () => {
  test.skip(
    process.env.STOREFRONT_SKIP_NO_JS_VARIANTS === "true",
    "STOREFRONT_SKIP_NO_JS_VARIANTS=true opts this storefront out of no-JS variant selection",
  );
  test.use({ javaScriptEnabled: false });

  test("product variant link loads server-selected variant", async ({ data, page }) => {
    const variant = await findServerVariantLink(page, data.products, data.paths);
    expect(variant.targetUrl).not.toBe(page.url());

    await variant.link.click();

    await expect(page).toHaveURL(variant.targetUrl);
    expectQuerySentinel(page.url());
    await expect(page.getByRole("heading", { level: 1, name: variant.productTitle })).toBeVisible();
    await expectCurrentVariantLinks(page, variant.linkName, variant.targetUrl);
  });
});

test.describe("variant control helpers", () => {
  test("reads variant control accessible names from the browser", async ({ page }) => {
    const href = "http://127.0.0.1/products/shirt?Size=Small";
    const cases = [
      {
        expected: "Size Small",
        html: `<span id="size-small">Size Small</span><a href="${href}" aria-labelledby="size-small" aria-label="Wrong">S</a>`,
        role: "link",
      },
      {
        expected: "Small",
        html: `<a href="${href}"><span aria-hidden="true">✓</span> Small</a>`,
        role: "link",
      },
      {
        expected: "Blue swatch",
        html: `<a href="${href}"><img alt="Blue swatch" src="data:,"></a>`,
        role: "link",
      },
      {
        expected: `L'été "Grande" \\ size: 10½`,
        html: `<a href="${href}" aria-label="L'été &quot;Grande&quot; \\ size: 10½">G</a>`,
        role: "link",
      },
      {
        expected: "Red: dark",
        html: `<button aria-pressed="true"><span aria-hidden="true">•</span> Red: dark</button>`,
        role: "button",
      },
    ] as const;
    await page.setContent(`<ul>${cases.map((item) => `<li>${item.html}</li>`).join("")}</ul>`);

    for (const [index, item] of cases.entries()) {
      const control = page.getByRole("listitem").nth(index).getByRole(item.role);
      expect(await accessibleName(control)).toBe(item.expected);
    }
  });

  test("matches current variant links by accessible name and href", async ({ page }) => {
    const target = "http://127.0.0.1/products/shirt?Size=Small&Color=Blue";
    const variantLinks = (peerCurrent: string) => `
      <a href="${target}" aria-current="true"><span aria-hidden="true">✓</span> Small</a>
      <a href="http://127.0.0.1/products/shirt?Color=Blue&Size=Small" aria-current="${peerCurrent}"><img alt="Small" src="data:,"></a>
      <a href="${target}" aria-label="Small fit">Small</a>
      <a href="http://127.0.0.1/products/shirt?Size=Small&Color=Red">Small</a>`;

    const name = "Small";
    await page.setContent(variantLinks("true"));
    await expectCurrentVariantLinks(page, name, target);

    await page.setContent(variantLinks("false"));
    expect(await currentVariantLinksState(page, name, target)).not.toBe(ALL_CURRENT);
  });
});

async function findServerVariantLink(
  page: Page,
  products: readonly ProductVariantProduct[],
  paths: Paths,
): Promise<ServerVariantLink> {
  const checkedPaths: string[] = [];

  for (const product of products) {
    const path = productPathWithSentinel(paths, product);
    checkedPaths.push(path);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: product.title })).toBeVisible();

    const link = await findVariantLink(page, product.optionNames);
    if (link === null) continue;

    const href = await link.getAttribute("href");
    if (href === null) continue;

    return {
      link,
      linkName: await accessibleName(link),
      productTitle: product.title,
      targetUrl: new URL(href, page.url()).href,
    };
  }

  throw new Error(
    `No product page exposed a same-product variant link without JavaScript. Checked: ${checkedPaths.join(", ")}. Render existing option values as links to selected-options URLs so selection works before hydration.`,
  );
}

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
  await page.goto(productPathWithSentinel(paths, product));
  await expect(page.getByRole("heading", { level: 1, name: product.title })).toBeVisible();

  const control = await findVariantControl(page, product.optionNames);
  if (control === null) return null;

  const name = await accessibleName(control);
  const beforeUrl = page.url();
  const rawHref = await control.getAttribute("href");
  const href = rawHref === null ? null : new URL(rawHref, beforeUrl).href;
  const pressedBefore = href === null ? await pressedButtons(page, name).count() : 0;
  await control.click();

  if (href === null) {
    await expect.poll(() => page.url()).not.toBe(beforeUrl);
    expect(hasVariantUrlSignal(beforeUrl, page.url(), product.optionNames)).toBe(true);
  } else {
    // A link selection must go to the same URL as the link's own href.
    await expect.poll(() => comparableUrl(page.url())).toBe(comparableUrl(href));
  }
  expectQuerySentinel(page.url());

  const selectedVariant = { href, name, productTitle: product.title, variantUrl: page.url() };
  await expectSelectedControl(page, selectedVariant, pressedBefore);

  return selectedVariant;
}

function productPathWithSentinel(paths: Paths, product: ProductVariantProduct): string {
  const query = new URLSearchParams({ [QUERY_SENTINEL_NAME]: QUERY_SENTINEL_VALUE });
  return `${paths.product(product.handle)}?${query}`;
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

function hasVariantUrlSignal(
  beforeUrl: string,
  afterUrl: string,
  optionNames: readonly string[],
): boolean {
  const before = new URL(beforeUrl);
  const after = new URL(afterUrl);
  return (
    before.pathname !== after.pathname || optionNames.some((name) => after.searchParams.has(name))
  );
}

async function expectSelectedControl(
  page: Page,
  selectedVariant: SelectedVariant,
  pressedBefore = 0,
): Promise<void> {
  if (selectedVariant.href !== null) {
    await expectCurrentVariantLinks(page, selectedVariant.name, selectedVariant.href);
    return;
  }

  // Buttons have no href to tell repeated labels apart, so this only proves that
  // one more button with the clicked label became pressed.
  await expect
    .poll(() => pressedButtons(page, selectedVariant.name).count())
    .toBeGreaterThan(pressedBefore);
}

/**
 * Every link with this name whose href resolves to the same URL as `targetUrl`
 * (query param order can differ) must be current, and there must be at least one.
 */
async function expectCurrentVariantLinks(
  page: Page,
  name: string,
  targetUrl: string,
): Promise<void> {
  await expect.poll(() => currentVariantLinksState(page, name, targetUrl)).toBe(ALL_CURRENT);
}

/** Returns ALL_CURRENT, or a description of why the matching links are not all current. */
async function currentVariantLinksState(
  page: Page,
  name: string,
  targetUrl: string,
): Promise<string> {
  const expectedUrl = comparableUrl(targetUrl);
  const pageUrl = page.url();
  const states = await page.getByRole("link", { name, exact: true }).evaluateAll((elements) =>
    elements.map((element) => ({
      current: element.getAttribute("aria-current"),
      href: element.getAttribute("href"),
    })),
  );
  const matches = states.filter(
    (state) =>
      state.href !== null && comparableUrl(new URL(state.href, pageUrl).href) === expectedUrl,
  );
  if (matches.length === 0) return `no "${name}" link to ${targetUrl}`;
  if (matches.every((state) => state.current === "true")) return ALL_CURRENT;
  return `aria-current values: ${matches.map((state) => String(state.current)).join(", ")}`;
}

function pressedButtons(page: Page, name: string): Locator {
  return page.getByRole("button", { name, exact: true, pressed: true });
}

async function findVariantControl(
  page: Page,
  optionNames: readonly string[],
): Promise<Locator | null> {
  const link = await findVariantLink(page, optionNames);
  if (link !== null) return link;

  return findUnselectedVariantButton(page);
}

/**
 * Reads the browser-computed accessible name from the root line of Playwright's
 * public ARIA snapshot, for example `- link "Small":` or `- 'button "Red: dark" [pressed]'`.
 */
async function accessibleName(control: Locator): Promise<string> {
  const [rootLine = ""] = (await control.ariaSnapshot()).split("\n", 1);
  const name = decodeAriaSnapshotRootName(rootLine);
  if (name === null) {
    throw new Error(
      `Could not read an accessible name from the ARIA snapshot root ${JSON.stringify(rootLine)}. Give the variant control a non-empty accessible name of at most 900 characters.`,
    );
  }

  return name;
}

function decodeAriaSnapshotRootName(rootLine: string): string | null {
  // When YAML needs it, Playwright wraps the whole key in single quotes and doubles inner ones.
  const quoted = /^- '((?:[^']|'')*)'(?::.*)?$/.exec(rootLine);
  const key = quoted
    ? quoted[1].replaceAll("''", "'")
    : /^- (.*?)(?::(?: .*)?)?$/.exec(rootLine)?.[1];
  if (key === undefined) return null;

  // The name is a JSON string, or raw when it starts and ends with "/". Flags such as [pressed] follow.
  const match = /^\w+ (?:("(?:[^"\\]|\\.)*")|(\/(?:.*\/)?))(?: \[[^\]]+\])*$/.exec(key);
  if (match === null) return null;

  const json = match[1];
  return json === undefined ? match[2] : (JSON.parse(json) as string);
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
