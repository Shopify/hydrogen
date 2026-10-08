import type { Locator, Page } from "@playwright/test";
import { signifierSelector } from "@shopify/hydrogen";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTRACT_DOC_PATH, StorefrontContractError } from "./contract";
import { h3, requireH3 } from "./signifiers";
import { EXPECT_TIMEOUT_MS } from "./timeouts";

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
  options: { readonly visible: boolean; readonly available?: boolean },
): FakeElement {
  return {
    id,
    visible: options.visible,
    attributes: {
      "data-h3": "product-add-to-cart",
      "data-h3-variant-id": `gid://shopify/ProductVariant/${id}`,
      "data-h3-available": String(options.available ?? true),
    },
  };
}

async function settle<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.advanceTimersByTimeAsync(EXPECT_TIMEOUT_MS + 1_000);
  const result = await settled;
  if ("error" in result) throw result.error;
  return result.value;
}

async function contractErrorFrom(promise: Promise<unknown>): Promise<StorefrontContractError> {
  const error = await settle(promise).then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof StorefrontContractError)) {
    throw new Error(`Expected StorefrontContractError, received ${String(error)}`);
  }
  return error;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("h3", () => {
  it("builds the locator only from signifierSelector", () => {
    const dom = createDom();

    h3(asPage(dom), "product-add-to-cart", { available: true });

    expect(dom.selectors).toEqual([signifierSelector("product-add-to-cart", { available: true })]);
  });
});

describe("requireH3", () => {
  it("returns the only attached element when it is visually hidden", async () => {
    const dom = createDom([addToCart("1", { visible: false })]);

    const locator = await settle(requireH3(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["1"]);
  });

  it("returns the unique visible element among hidden copies", async () => {
    const dom = createDom([
      addToCart("hidden-a", { visible: false }),
      addToCart("shown", { visible: true }),
      addToCart("hidden-b", { visible: false }),
    ]);

    const locator = await settle(requireH3(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["shown"]);
  });

  it("narrows matches by state before it checks for ambiguity", async () => {
    const dom = createDom([
      addToCart("sold-out", { visible: true, available: false }),
      addToCart("in-stock", { visible: true, available: true }),
    ]);

    const locator = await settle(
      requireH3(asPage(dom), "product-add-to-cart", { available: true }),
    );

    expect(idsOf(locator)).toEqual(["in-stock"]);
  });

  it("waits for an element that is attached late", async () => {
    const dom = createDom();
    let countCalls = 0;
    dom.onCount = () => {
      countCalls += 1;
      if (countCalls === 5) dom.elements.push(addToCart("late", { visible: true }));
    };

    const locator = await settle(requireH3(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["late"]);
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

    const locator = await settle(requireH3(scope, "product-add-to-cart"));
    expect(idsOf(locator)).toEqual(["inside"]);

    const error = await contractErrorFrom(
      requireH3(scope, "product-add-to-cart", { available: false }),
    );
    expect(error.routePath).toBe("/products/shirt?Size=M");
  });

  it("reports a missing signifier with both fix paths", async () => {
    const dom = createDom([addToCart("sold-out", { visible: true, available: false })]);

    const error = await contractErrorFrom(
      requireH3(asPage(dom), "product-add-to-cart", { available: true }),
    );

    expect(error.signifier).toMatchObject({
      name: "product-add-to-cart",
      problem: "missing",
      state: { available: true },
      attachedCount: 0,
      visibleCount: 0,
    });
    expect(error.routePath).toBe("/products/shirt?Size=M");
    expect(error.docsAnchor).toBe("#product-add-to-cart");
    expect(error.message).toContain("Missing storefront e2e signifier: product-add-to-cart");
    expect(error.message).toContain("/products/shirt?Size=M");
    expect(error.message).toContain("register('addToCart', {})");
    expect(error.message).toContain("signifier('product-add-to-cart', { variantId, available })");
    expect(error.message).toContain(`${CONTRACT_DOC_PATH}#product-add-to-cart`);
  });

  it.each([
    {
      name: "more than one visible element",
      elements: [
        addToCart("a", { visible: true }),
        addToCart("b", { visible: true }),
        addToCart("c", { visible: false }),
      ],
      attachedCount: 3,
      visibleCount: 2,
    },
    {
      name: "more than one hidden element",
      elements: [addToCart("a", { visible: false }), addToCart("b", { visible: false })],
      attachedCount: 2,
      visibleCount: 0,
    },
  ])("reports $name as ambiguous", async ({ elements, attachedCount, visibleCount }) => {
    const dom = createDom(elements);

    const error = await contractErrorFrom(requireH3(asPage(dom), "product-add-to-cart"));

    expect(error.signifier).toMatchObject({ problem: "ambiguous", attachedCount, visibleCount });
    expect(error.message).toContain("Ambiguous storefront e2e signifier: product-add-to-cart");
    expect(error.message).toContain(`Found: ${attachedCount} attached, ${visibleCount} visible`);
  });

  it("rethrows an unrelated count failure without a contract error", async () => {
    const dom = createDom();
    const failure = new Error("Target page, context or browser has been closed");
    dom.onCount = () => {
      throw failure;
    };

    await expect(settle(requireH3(asPage(dom), "product-add-to-cart"))).rejects.toBe(failure);
  });
});
