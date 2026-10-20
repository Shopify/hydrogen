import type { Locator, Page } from "@playwright/test";

import { expectProductTitle, PRODUCT_VARIANT_OPTION_TEST_ID } from "../../src/product-targets";
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

  await expectProductTitle(page, selectedVariant.productTitle, selectedVariant.variantUrl);
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
    await expectProductTitle(page, variant.productTitle, variant.targetUrl);
    await expectCurrentVariantLinks(page, variant.linkName, variant.targetUrl);
  });
});

test.describe("variant control helpers", () => {
  const OPTION = `data-testid="${PRODUCT_VARIANT_OPTION_TEST_ID}"`;
  const PRODUCT_URL = "http://storefront.test/products/shirt?storefront_e2e_ref=variant-check";

  /** Serves `html` at PRODUCT_URL so relative variant hrefs resolve like a real product page. */
  async function gotoProductPage(page: Page, html: string): Promise<void> {
    await page.route(
      (url) => url.href === PRODUCT_URL,
      async (route) => {
        await route.fulfill({ body: `<!doctype html>${html}`, contentType: "text/html" });
      },
    );
    await page.goto(PRODUCT_URL);
  }

  test("reads variant control accessible names from the browser", async ({ page }) => {
    const href = "http://127.0.0.1/products/shirt?Size=Small";
    const cases = [
      {
        expected: "Size Small",
        html: `<span id="size-small">Size Small</span><a ${OPTION} href="${href}" aria-labelledby="size-small" aria-label="Wrong">S</a>`,
        role: "link",
      },
      {
        expected: "Small",
        html: `<a ${OPTION} href="${href}"><span aria-hidden="true">✓</span> Small</a>`,
        role: "link",
      },
      {
        expected: "Blue swatch",
        html: `<a ${OPTION} href="${href}"><img alt="Blue swatch" src="data:,"></a>`,
        role: "link",
      },
      {
        expected: `L'été "Grande" \\ size: 10½`,
        html: `<a ${OPTION} href="${href}" aria-label="L'été &quot;Grande&quot; \\ size: 10½">G</a>`,
        role: "link",
      },
      {
        expected: "Red: dark",
        html: `<button ${OPTION} aria-pressed="true"><span aria-hidden="true">•</span> Red: dark</button>`,
        role: "button",
      },
    ] as const;
    await page.setContent(`<ul>${cases.map((item) => `<li>${item.html}</li>`).join("")}</ul>`);

    for (const [index, item] of cases.entries()) {
      const control = page
        .getByRole("listitem")
        .nth(index)
        .getByRole(item.role)
        .and(optionValues(page));
      expect(await accessibleName(control)).toBe(item.expected);
    }
  });

  test("matches current variant links by accessible name and href", async ({ page }) => {
    const target = "http://127.0.0.1/products/shirt?Size=Small&Color=Blue";
    const variantLinks = (peerCurrent: string) => `
      <nav><a href="${target}">Small</a></nav>
      <a ${OPTION} href="${target}" aria-current="true"><span aria-hidden="true">✓</span> Small</a>
      <a ${OPTION} href="http://127.0.0.1/products/shirt?Color=Blue&Size=Small" aria-current="${peerCurrent}"><img alt="Small" src="data:,"></a>
      <a ${OPTION} href="${target}" aria-label="Small fit">Small</a>
      <a ${OPTION} href="http://127.0.0.1/products/shirt?Size=Small&Color=Red">Small</a>`;

    const name = "Small";
    // The decoy nav link has the same name and href but is not an option value, so it is ignored.
    await page.setContent(variantLinks("true"));
    await expectCurrentVariantLinks(page, name, target);

    await page.setContent(variantLinks("false"));
    expect(await currentVariantLinksState(page, name, target)).not.toBe(ALL_CURRENT);

    // A current link without the option test ID is not evidence of selection.
    await page.setContent(`<a href="${target}" aria-current="true">Small</a>`);
    expect(await currentVariantLinksState(page, name, target)).toBe(
      `no "${name}" link to ${target}`,
    );
  });

  test("counts only pressed option value buttons", async ({ page }) => {
    await page.setContent(`
      <button aria-pressed="true">Red</button>
      <button ${OPTION} aria-pressed="false">Red</button>`);
    await expect(pressedButtons(page, "Red")).toHaveCount(0);

    await page.setContent(`
      <button aria-pressed="true">Red</button>
      <button ${OPTION} aria-pressed="true">Red</button>`);
    await expect(pressedButtons(page, "Red")).toHaveCount(1);
  });

  test("finds unselected option links by test ID and skips decoys", async ({ page }) => {
    await gotoProductPage(
      page,
      `
      <nav><a href="/products/shirt?Size=Large">Large</a></nav>
      <span ${OPTION}><a href="/products/shirt?Size=Huge">Huge</a></span>
      <a ${OPTION} href="/products/shirt?Size=Small" aria-current="true">Small</a>
      <a data-testid="product-sibling-option" href="/products/shirt?Size=Large">Large jacket</a>
      <a ${OPTION} href="/products/shirt?Size=Medium">Medium</a>`,
    );

    const control = await findVariantControl(page);

    expect(control).not.toBeNull();
    if (control === null) return;
    await expect(control).toHaveAttribute("href", "/products/shirt?Size=Medium");
    expect(await accessibleName(control)).toBe("Medium");
  });

  test("finds unselected option buttons by test ID and skips decoys", async ({ page }) => {
    await gotoProductPage(
      page,
      `
      <nav><a href="/products/shirt?Color=Green">Green</a></nav>
      <button aria-pressed="false">Wishlist</button>
      <button ${OPTION} aria-pressed="true">Red</button>
      <button ${OPTION} aria-pressed="false" disabled>Green</button>
      <span ${OPTION}><button aria-pressed="false">Yellow</button></span>
      <button ${OPTION} aria-pressed="false">Blue</button>`,
    );

    const control = await findVariantControl(page);

    expect(control).not.toBeNull();
    if (control === null) return;
    expect(await accessibleName(control)).toBe("Blue");
  });

  test("returns no control when option values lack the test ID", async ({ page }) => {
    await gotoProductPage(
      page,
      `
      <a href="/products/shirt?Size=Medium">Medium</a>
      <button aria-pressed="false">Blue</button>`,
    );

    expect(await findVariantControl(page)).toBeNull();
    expect(await optionTargetSummary(page)).toBe(
      `0 data-testid="${PRODUCT_VARIANT_OPTION_TEST_ID}" targets, 0 on links or buttons`,
    );
  });
});

test.describe("variant relationship helpers", () => {
  const ORIGIN = "http://storefront.test";
  const SENTINEL = `${QUERY_SENTINEL_NAME}=${QUERY_SENTINEL_VALUE}`;
  const paths: Paths = { product: (handle: string) => `${ORIGIN}/products/${handle}` };
  const product: ProductVariantProduct = {
    handle: "shirt/small",
    optionNames: ["Size"],
    title: "Shirt",
  };

  /**
   * Serves one product page per size path, so links navigate with real GET
   * requests. The sibling option comes first, and its URL looks like a
   * same-product variant (same path plus a Size query).
   */
  async function servePathVariants(page: Page): Promise<void> {
    await page.route(`${ORIGIN}/products/shirt/**`, async (route) => {
      const size = new URL(route.request().url()).pathname.split("/").at(-1);
      const option = (slug: string, label: string) =>
        `<a data-testid="product-variant-option" href="/products/shirt/${slug}?${SENTINEL}"${size === slug ? ' aria-current="true"' : ""}>${label}</a>`;
      const body = `<!doctype html><h1 data-testid="product-title">Shirt</h1>
        <a data-testid="product-sibling-option" href="/products/shirt/${size}?Size=Medium&${SENTINEL}">Medium jacket</a>
        ${option("small", "Small")}
        <a data-testid="product-variant-option" href="/products/shirt/large?${SENTINEL}" hidden>Large</a>
        <a data-testid="product-variant-option" href="/products/shirt/xl?${SENTINEL}" aria-disabled="true">XL</a>
        ${option("medium", "Medium - Sold out")}`;
      await route.fulfill({ body, contentType: "text/html" });
    });
  }

  test("selects a path-based variant link and skips sibling, current, hidden, and disabled options", async ({
    page,
  }) => {
    await servePathVariants(page);

    const selected = await selectVariantForProduct(page, product, paths);
    if (selected === null) throw new Error("Expected a selectable variant link");

    // The sold-out value is still selectable. The suite follows its real href.
    expect(selected.name).toBe("Medium - Sold out");
    expect(selected.href).toBe(`${ORIGIN}/products/shirt/medium?${SENTINEL}`);

    await page.goto(selected.variantUrl);
    await expect(page.getByTestId("product-title")).toHaveText("Shirt");
    await expectSelectedControl(page, selected);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("follows a path-based variant link with a real GET navigation", async ({ page }) => {
      await servePathVariants(page);

      const variant = await findServerVariantLink(page, [product], paths);
      expect(variant.targetUrl).toBe(`${ORIGIN}/products/shirt/medium?${SENTINEL}`);

      await variant.link.click();

      await expect(page).toHaveURL(variant.targetUrl);
      await expectCurrentVariantLinks(page, variant.linkName, variant.targetUrl);
    });
  });

  test("skips the sibling and the disabled invalid variant button, and selects an enabled one", async ({
    page,
  }) => {
    await page.route(`${ORIGIN}/products/shirt/**`, async (route) => {
      const size = new URL(route.request().url()).pathname.split("/").at(-1);
      const body = `<!doctype html><h1 data-testid="product-title">Shirt</h1>
        <button data-testid="product-sibling-option" aria-pressed="false" onclick="location.href = '/products/jacket?${SENTINEL}'">Jacket</button>
        <button data-testid="product-variant-option" aria-pressed="${size === "small"}">Small</button>
        <button data-testid="product-variant-option" aria-pressed="false" disabled>Large</button>
        <button data-testid="product-variant-option" aria-pressed="${size === "medium"}" onclick="history.pushState(null, '', '/products/shirt/medium?${SENTINEL}'); this.setAttribute('aria-pressed', 'true')">Medium</button>`;
      await route.fulfill({ body, contentType: "text/html" });
    });

    const selected = await selectVariantForProduct(page, product, paths);
    if (selected === null) throw new Error("Expected a selectable variant button");

    expect(selected.name).toBe("Medium");
    expect(new URL(selected.variantUrl).pathname).toBe("/products/shirt/medium");

    await page.goto(selected.variantUrl);
    await expectSelectedControl(page, selected);
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
    await page.goto(path);
    await expectProductTitle(page, product.title, path);

    const link = await findVariantLink(page);
    const href = link === null ? null : await link.getAttribute("href");
    if (link === null || href === null) {
      checkedPaths.push(`${path} (${await optionTargetSummary(page)})`);
      continue;
    }

    return {
      link,
      linkName: await accessibleName(link),
      productTitle: product.title,
      targetUrl: new URL(href, page.url()).href,
    };
  }

  throw new Error(
    `No product page exposed an unselected product-variant-option link without JavaScript. Checked: ${checkedPaths.join(", ")}. Put data-testid="${PRODUCT_VARIANT_OPTION_TEST_ID}" on each option value <a> that selects another variant of the same product, so selection works before hydration.`,
  );
}

async function selectProductVariant(
  page: Page,
  products: readonly ProductVariantProduct[],
  paths: Paths,
): Promise<SelectedVariant> {
  const checkedPaths: string[] = [];

  for (const product of products) {
    const selectedVariant = await selectVariantForProduct(page, product, paths);
    if (selectedVariant !== null) return selectedVariant;
    checkedPaths.push(
      `${productPathWithSentinel(paths, product)} (${await optionTargetSummary(page)})`,
    );
  }

  throw new Error(
    `No product page exposed a selectable variant control. Checked: ${checkedPaths.join(", ")}. Put data-testid="${PRODUCT_VARIANT_OPTION_TEST_ID}" on each same-product option value <a> or <button> itself.`,
  );
}

async function selectVariantForProduct(
  page: Page,
  product: ProductVariantProduct,
  paths: Paths,
): Promise<SelectedVariant | null> {
  const path = productPathWithSentinel(paths, product);
  await page.goto(path);
  await expectProductTitle(page, product.title, path);

  const control = await findVariantControl(page);
  if (control === null) return null;

  const name = await accessibleName(control);
  const beforeUrl = page.url();
  const rawHref = await control.getAttribute("href");
  const href = rawHref === null ? null : new URL(rawHref, beforeUrl).href;
  const pressedBefore = href === null ? await pressedButtons(page, name).count() : 0;
  await control.click();

  if (href === null) {
    await expect.poll(() => page.url()).not.toBe(beforeUrl);
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
  const links = page.getByRole("link", { name, exact: true }).and(optionValues(page));
  const states = await links.evaluateAll((elements) =>
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
  return page.getByRole("button", { name, exact: true, pressed: true }).and(optionValues(page));
}

/** Option value targets. The test ID must be on the link or button itself. */
function optionValues(page: Page): Locator {
  return page.getByTestId(PRODUCT_VARIANT_OPTION_TEST_ID);
}

/** Describes the option value targets on the page for failure messages. */
async function optionTargetSummary(page: Page): Promise<string> {
  const targets = await optionValues(page).count();
  const controls = await page
    .getByRole("link", { includeHidden: true })
    .or(page.getByRole("button", { includeHidden: true }))
    .and(optionValues(page))
    .count();
  return `${targets} data-testid="${PRODUCT_VARIANT_OPTION_TEST_ID}" targets, ${controls} on links or buttons`;
}

async function findVariantControl(page: Page): Promise<Locator | null> {
  const link = await findVariantLink(page);
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
  const buttons = page.getByRole("button").and(optionValues(page));
  const count = Math.min(await buttons.count(), MAX_VARIANT_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const pressed = await button.getAttribute("aria-pressed");
    const usable = pressed === "false" && (await button.isVisible()) && (await button.isEnabled());
    if (usable) return button;
  }

  return null;
}

async function findVariantLink(page: Page): Promise<Locator | null> {
  const links = page.getByRole("link").and(optionValues(page));
  const count = Math.min(await links.count(), MAX_VARIANT_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    if (await isCurrentLink(link)) continue;
    if (!(await link.isEnabled())) continue;

    // The test ID says that the link selects a variant of this product. Any URL
    // shape works; the link only needs a real href to another URL.
    const href = await link.getAttribute("href");
    if (href === null || new URL(href, page.url()).href === page.url()) continue;
    if (await link.isVisible()) return link;
  }

  return null;
}

async function isCurrentLink(link: Locator): Promise<boolean> {
  const ariaCurrent = await link.getAttribute("aria-current");
  return ariaCurrent !== null && ariaCurrent !== "false";
}
