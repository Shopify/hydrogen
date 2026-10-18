import { errors, type Locator, type Page } from "@playwright/test";
import { signifierSelector } from "@shopify/hydrogen";
import { describe, expect, it } from "vitest";

import { CONTRACT_DOC_PATH, StorefrontContractError } from "./contract";
import { locateSignifier, requireSignifier } from "./signifiers";

type FakeElement = {
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly visible: boolean;
  readonly children?: readonly FakeElement[];
};

type FakeDom = {
  elements: FakeElement[];
  url: string;
  readonly selectors: string[];
  onCount?: () => void;
  // Replaces the default waitFor stub. The native waiter belongs to Playwright.
  waitFor?: () => Promise<void>;
};

// Supports only the attribute selectors that signifierSelector() returns.
function matchesSelector(element: FakeElement, selector: string): boolean {
  const attributePattern = /\[([\w-]+)="((?:[^"\\]|\\.)*)"\]/g;
  const consumed = [...selector.matchAll(attributePattern)];
  if (consumed.map((match) => match[0]).join("") !== selector) {
    throw new Error(`Fake DOM cannot parse selector: ${selector}`);
  }
  return consumed.every(
    ([, attribute, value]) => element.attributes[attribute] === value.replace(/\\(.)/g, "$1"),
  );
}

class FakeLocator {
  constructor(
    private readonly dom: FakeDom,
    private readonly resolve: () => readonly FakeElement[],
  ) {}

  locator(selector: string): FakeLocator {
    this.dom.selectors.push(selector);
    return new FakeLocator(this.dom, () =>
      this.resolve().flatMap((element) =>
        (element.children ?? []).filter((child) => matchesSelector(child, selector)),
      ),
    );
  }

  filter(options: { readonly visible?: boolean }): FakeLocator {
    if (options.visible !== true) throw new Error("Fake locator supports only visible: true");
    return new FakeLocator(this.dom, () => this.resolve().filter((element) => element.visible));
  }

  first(): FakeLocator {
    return new FakeLocator(this.dom, () => this.resolve().slice(0, 1));
  }

  // Default stub: resolves when the locator matches now, else fails like a Playwright timeout.
  async waitFor(): Promise<void> {
    if (this.dom.waitFor !== undefined) return this.dom.waitFor();
    if (this.resolve().length === 0) throw new errors.TimeoutError("locator.waitFor: Timeout");
  }

  async count(): Promise<number> {
    this.dom.onCount?.();
    return this.resolve().length;
  }

  page(): FakePage {
    return new FakePage(this.dom);
  }

  ids(): string[] {
    return this.resolve().map((element) => element.id);
  }
}

class FakePage {
  constructor(private readonly dom: FakeDom) {}

  locator(selector: string): FakeLocator {
    this.dom.selectors.push(selector);
    return new FakeLocator(this.dom, () =>
      this.dom.elements.filter((element) => matchesSelector(element, selector)),
    );
  }

  url(): string {
    return this.dom.url;
  }
}

function createDom(elements: FakeElement[] = []): FakeDom {
  return { elements, url: "https://shop.example/products/shirt?Size=M", selectors: [] };
}

function asPage(dom: FakeDom): Page {
  return new FakePage(dom) as unknown as Page;
}

function idsOf(locator: Locator): string[] {
  return (locator as unknown as FakeLocator).ids();
}

function addToCart(
  id: string,
  options: { readonly visible: boolean; readonly availableForSale?: boolean },
): FakeElement {
  return {
    id,
    visible: options.visible,
    attributes: {
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": `gid://shopify/ProductVariant/${id}`,
      "data-shopify-available-for-sale": String(options.availableForSale ?? true),
    },
  };
}

async function contractErrorFrom(promise: Promise<unknown>): Promise<StorefrontContractError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof StorefrontContractError)) {
    throw new Error(`Expected StorefrontContractError, received ${String(error)}`);
  }
  return error;
}

describe("locateSignifier", () => {
  it("builds the locator only from signifierSelector", () => {
    const dom = createDom();

    locateSignifier(asPage(dom), "product-add-to-cart", { availableForSale: true });

    expect(dom.selectors).toEqual([
      signifierSelector("product-add-to-cart", { availableForSale: true }),
    ]);
  });

  it("returns every attached match, also hidden ones, so absence checks see them", () => {
    const dom = createDom([
      addToCart("hidden", { visible: false }),
      addToCart("shown", { visible: true }),
      addToCart("sold-out", { visible: true, availableForSale: false }),
    ]);

    const locator = locateSignifier(asPage(dom), "product-add-to-cart", { availableForSale: true });

    expect(idsOf(locator)).toEqual(["hidden", "shown"]);
  });
});

describe("requireSignifier", () => {
  it("returns the first visible element when more than one is visible", async () => {
    const dom = createDom([
      addToCart("hidden", { visible: false }),
      addToCart("shown-a", { visible: true }),
      addToCart("shown-b", { visible: true }),
    ]);

    const locator = await requireSignifier(asPage(dom), "product-add-to-cart");

    expect(idsOf(locator)).toEqual(["shown-a"]);
  });

  it("returns the visible element among hidden copies", async () => {
    const dom = createDom([
      addToCart("hidden-a", { visible: false }),
      addToCart("shown", { visible: true }),
      addToCart("hidden-b", { visible: false }),
    ]);

    const locator = await requireSignifier(asPage(dom), "product-add-to-cart");

    expect(idsOf(locator)).toEqual(["shown"]);
  });

  it("narrows matches by state before it picks the first visible element", async () => {
    const dom = createDom([
      addToCart("sold-out", { visible: true, availableForSale: false }),
      addToCart("in-stock", { visible: true, availableForSale: true }),
    ]);

    const locator = await requireSignifier(asPage(dom), "product-add-to-cart", {
      availableForSale: true,
    });

    expect(idsOf(locator)).toEqual(["in-stock"]);
  });

  it("searches only inside a locator scope and reports the page route", async () => {
    const dom = createDom([
      addToCart("outside", { visible: true }),
      {
        id: "dialog",
        visible: true,
        attributes: { role: "dialog" },
        children: [addToCart("inside", { visible: true })],
      },
    ]);
    const scope = new FakePage(dom).locator('[role="dialog"]') as unknown as Locator;

    const locator = await requireSignifier(scope, "product-add-to-cart");
    expect(idsOf(locator)).toEqual(["inside"]);

    const error = await contractErrorFrom(
      requireSignifier(scope, "product-add-to-cart", { availableForSale: false }),
    );
    expect(error.routePath).toBe("/products/shirt?Size=M");
  });

  it("reports a missing signifier with both fix paths", async () => {
    const dom = createDom([addToCart("sold-out", { visible: true, availableForSale: false })]);

    const error = await contractErrorFrom(
      requireSignifier(asPage(dom), "product-add-to-cart", { availableForSale: true }),
    );

    expect(error.signifier).toMatchObject({
      name: "product-add-to-cart",
      problem: "missing",
      state: { availableForSale: true },
      attachedCount: 0,
      visibleCount: 0,
    });
    expect(error.cause).toBeInstanceOf(errors.TimeoutError);
    expect(error.routePath).toBe("/products/shirt?Size=M");
    expect(error.docsAnchor).toBe("#product-add-to-cart");
    expect(error.message).toContain("Missing storefront e2e signifier: product-add-to-cart");
    expect(error.message).toContain("/products/shirt?Size=M");
    expect(error.message).toContain("register('addToCart', {})");
    expect(error.message).toContain(
      "signifier('product-add-to-cart', { variantId, availableForSale })",
    );
    expect(error.message).toContain(`${CONTRACT_DOC_PATH}#product-add-to-cart`);
  });

  it.each([
    {
      name: "one hidden element",
      elements: [addToCart("a", { visible: false })],
      attachedCount: 1,
    },
    {
      name: "more than one hidden element",
      elements: [addToCart("a", { visible: false }), addToCart("b", { visible: false })],
      attachedCount: 2,
    },
  ])(
    "reports $name as not visible when the wait times out",
    async ({ elements, attachedCount }) => {
      const dom = createDom(elements);
      const timeout = new errors.TimeoutError("locator.waitFor: Timeout");
      dom.waitFor = () => Promise.reject(timeout);

      const error = await contractErrorFrom(requireSignifier(asPage(dom), "product-add-to-cart"));

      expect(error.cause).toBe(timeout);
      expect(error.signifier).toMatchObject({
        problem: "not-visible",
        attachedCount,
        visibleCount: 0,
      });
      expect(error.message).toContain("Storefront e2e signifier not visible: product-add-to-cart");
      expect(error.message).toContain(`Found: ${attachedCount} attached, 0 visible`);
      expect(error.message).toContain("Open the UI that contains it");
      expect(error.message).not.toMatch(/more than one|only one/i);
    },
  );

  it("rethrows a browser failure from the wait without a contract error", async () => {
    const dom = createDom();
    const failure = new Error("Target page, context or browser has been closed");
    dom.waitFor = () => Promise.reject(failure);

    await expect(requireSignifier(asPage(dom), "product-add-to-cart")).rejects.toBe(failure);
  });

  it("rethrows a count failure after a timeout without a contract error", async () => {
    const dom = createDom();
    const failure = new Error("Target page, context or browser has been closed");
    dom.onCount = () => {
      throw failure;
    };

    await expect(requireSignifier(asPage(dom), "product-add-to-cart")).rejects.toBe(failure);
  });
});
