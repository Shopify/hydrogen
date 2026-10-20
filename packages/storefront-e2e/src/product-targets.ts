import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError, type ContractCapability } from "./contract";

// Product test IDs from docs/storefront-contract.md#product-test-ids.
export const PRODUCT_TITLE_TEST_ID = "product-title";
export const PRODUCT_VARIANT_OPTION_TEST_ID = "product-variant-option";
export const PRODUCT_ADD_TO_CART_TEST_ID = "product-add-to-cart";

type SingleProductTarget = {
  readonly capability: ContractCapability;
  readonly description: string;
  /** The native element the test ID must be on. */
  readonly element: "button" | "h1";
  readonly testId: string;
};

type TargetOptions = {
  /** How long to wait for exactly one target. Defaults to the expect timeout. */
  readonly timeout?: number;
};

const PRODUCT_TITLE_TARGET: SingleProductTarget = {
  capability: "product-route",
  description: "product heading",
  element: "h1",
  testId: PRODUCT_TITLE_TEST_ID,
};

const PRODUCT_ADD_TO_CART_TARGET: SingleProductTarget = {
  capability: "product-cart",
  description: "add to cart button",
  element: "button",
  testId: PRODUCT_ADD_TO_CART_TEST_ID,
};

/**
 * Expects the single product title target to be a visible native <h1> that
 * contains the title. Like the previous heading role name match, the text
 * match is case-insensitive and allows surrounding text.
 */
export async function expectProductTitle(
  page: Page,
  title: string,
  routePath: string,
  options: TargetOptions = {},
): Promise<void> {
  const target = await requireSingleProductTarget(page, PRODUCT_TITLE_TARGET, routePath, options);
  // Keep the heading semantics of the previous level-one heading role lookup.
  const heading = page.getByRole("heading", { level: 1 }).and(target);
  const isVisibleHeading = await expect(heading)
    .toBeVisible({ timeout: options.timeout })
    .then(
      () => true,
      () => false,
    );
  if (!isVisibleHeading) {
    throw createContractError({
      capability: PRODUCT_TITLE_TARGET.capability,
      routePath,
      expectation: `The <h1> with data-testid="${PRODUCT_TITLE_TEST_ID}" is a visible level-one heading.`,
      likelyFix:
        "Keep the product title <h1> visible and exposed as the page heading to assistive technology.",
      docsAnchor: "#product-test-ids",
    });
  }
  await expect(heading).toContainText(title, { ignoreCase: true, timeout: options.timeout });
}

/**
 * Returns the single native add to cart <button>. A missing, duplicate, or
 * non-button target is a contract failure, not an unavailable product.
 */
export async function requireProductAddToCart(
  page: Page,
  routePath: string,
  options: TargetOptions = {},
): Promise<Locator> {
  return requireSingleProductTarget(page, PRODUCT_ADD_TO_CART_TARGET, routePath, options);
}

async function requireSingleProductTarget(
  page: Page,
  target: SingleProductTarget,
  routePath: string,
  { timeout }: TargetOptions,
): Promise<Locator> {
  const locator = page.getByTestId(target.testId);
  const attribute = `data-testid="${target.testId}"`;

  try {
    await expect(locator).toHaveCount(1, { timeout });
  } catch {
    const count = await locator.count();
    throw createContractError({
      capability: target.capability,
      routePath,
      expectation: `The product page renders exactly one element with ${attribute} (the ${target.description}). Found ${count}.`,
      likelyFix:
        count === 0
          ? `Add ${attribute} to the ${target.description}.`
          : `Keep ${attribute} only on the ${target.description}. Remove it from other elements.`,
      docsAnchor: "#product-test-ids",
    });
  }

  const element = await locator.evaluate((node) => node.localName);
  if (element !== target.element) {
    throw createContractError({
      capability: target.capability,
      routePath,
      expectation: `The element with ${attribute} is the native <${target.element}> ${target.description}. Found <${element}>.`,
      likelyFix: `Put ${attribute} on the native <${target.element}> element, not on a wrapper or an element with an ARIA role.`,
      docsAnchor: "#product-test-ids",
    });
  }

  return locator;
}
