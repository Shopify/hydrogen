import type { Locator, Page } from "@playwright/test";
import { signifier, signifierSelector } from "@shopify/hydrogen";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTRACT_DOC_PATH, StorefrontContractError } from "./contract";
import { locateSignifier, requireSignifier } from "./signifiers";
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
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": `gid://shopify/ProductVariant/${id}`,
      "data-shopify-available": String(options.available ?? true),
    },
  };
}

async function settle<T>(promise: Promise<T>, timeout = EXPECT_TIMEOUT_MS): Promise<T> {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.advanceTimersByTimeAsync(timeout + 1_000);
  const result = await settled;
  if ("error" in result) throw result.error;
  return result.value;
}

async function contractErrorFrom(
  promise: Promise<unknown>,
  timeout = EXPECT_TIMEOUT_MS,
): Promise<StorefrontContractError> {
  const error = await settle(promise, timeout).then(
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

describe("locateSignifier", () => {
  it("builds the locator only from signifierSelector", () => {
    const dom = createDom();

    locateSignifier(asPage(dom), "product-add-to-cart", { available: true });

    expect(dom.selectors).toEqual([signifierSelector("product-add-to-cart", { available: true })]);
  });
});

describe("requireSignifier", () => {
  it("finds the unique visible merchandise line among hidden drawer copies", async () => {
    const attributes = signifier("cart-line", {
      merchandiseId: "variant-1",
      quantity: 2,
      pending: false,
    });
    const dom = createDom([
      { id: "drawer", attributes, visible: false },
      { id: "page", attributes, visible: true },
    ]);
    const line = await settle(
      requireSignifier(asPage(dom), "cart-line", { merchandiseId: "variant-1" }),
    );
    expect(idsOf(line)).toEqual(["page"]);
    expect(dom.selectors).toEqual([signifierSelector("cart-line", { merchandiseId: "variant-1" })]);
  });

  it("waits through a hidden-only hydration state and returns a live visible locator", async () => {
    const attributes = signifier("cart-line", {
      merchandiseId: "variant-1",
      quantity: 1,
      pending: false,
    });
    const dom = createDom([{ id: "drawer", attributes, visible: false }]);
    let resolved = false;
    const lookup = requireSignifier(
      asPage(dom),
      "cart-line",
      { merchandiseId: "variant-1" },
      { timeout: 15_000, visible: true },
    ).then((line) => {
      resolved = true;
      return line;
    });

    await vi.advanceTimersByTimeAsync(12_000);
    expect(resolved).toBe(false);
    dom.elements.push({ id: "page", attributes, visible: true });

    const line = await settle(lookup, 3_000);
    expect(dom.elements).toHaveLength(2);
    expect(idsOf(line)).toEqual(["page"]);
    dom.elements.push({ id: "another-hidden-copy", attributes, visible: false });
    expect(await line.count()).toBe(1);
    expect(idsOf(line)).toEqual(["page"]);
  });

  it.each([1, 2])(
    "reports a visibility contract error when %i attached cart lines never become visible",
    async (attachedCount) => {
      const attributes = signifier("cart-line", {
        merchandiseId: "variant-1",
        quantity: 1,
        pending: false,
      });
      const dom = createDom(
        Array.from({ length: attachedCount }, (_, index) => ({
          id: `hidden-${index}`,
          attributes,
          visible: false,
        })),
      );
      const error = await contractErrorFrom(
        requireSignifier(
          asPage(dom),
          "cart-line",
          { merchandiseId: "variant-1" },
          { timeout: 15_000, visible: true },
        ),
        15_000,
      );

      expect(error.signifier).toMatchObject({
        name: "cart-line",
        problem: "missing",
        attachedCount,
        visibleCount: 0,
      });
      expect(error.message).toContain("Exactly one visible element");
      expect(error.message).toContain("15000ms");
      expect(error.message).toContain("Make the matching element visible");
      expect(error.message).toContain("lineProps(line)");
    },
  );

  it("rejects multiple visible lines for the same merchandise instead of taking the first", async () => {
    const attributes = signifier("cart-line", {
      merchandiseId: "variant-1",
      quantity: 1,
      pending: false,
    });
    const dom = createDom([
      { id: "a", attributes, visible: true },
      { id: "b", attributes, visible: true },
    ]);
    const error = await contractErrorFrom(
      requireSignifier(
        asPage(dom),
        "cart-line",
        { merchandiseId: "variant-1" },
        { timeout: 15_000, visible: true },
      ),
      15_000,
    );
    expect(error.signifier).toMatchObject({
      name: "cart-line",
      problem: "ambiguous",
      visibleCount: 2,
    });
    expect(error.message).toContain("Ambiguous storefront e2e signifier: cart-line");
    expect(error.message).toContain("Keep only one visible control");
  });

  it.each([
    "cart-line-quantity",
    "cart-line-increase",
    "cart-line-decrease",
    "cart-line-remove",
  ] as const)("requires %s inside its line and explains misplaced controls", async (testId) => {
    const attributes = signifier("cart-line", {
      merchandiseId: "variant-1",
      quantity: 1,
      pending: false,
    });
    const control = { id: "control", attributes: signifier(testId, {}), visible: true };
    const dom = createDom([
      { id: "line", attributes, visible: true, children: [control] },
      { ...control, id: "outside" },
    ]);
    const line = await settle(
      requireSignifier(asPage(dom), "cart-line", { merchandiseId: "variant-1" }),
    );
    expect(idsOf(await settle(requireSignifier(line, testId)))).toEqual(["control"]);

    dom.elements = [{ id: "line", attributes, visible: true }, control];
    const error = await contractErrorFrom(requireSignifier(line, testId));
    expect(error.signifier).toMatchObject({ name: testId, problem: "missing" });
    expect(error.message).toContain("outside its cart-line container");
    expect(error.message).toContain(`signifier('${testId}', {})`);
    expect(error.docsAnchor).toBe("#cart-line-controls");
  });

  it("returns the only attached element when it is visually hidden", async () => {
    const dom = createDom([addToCart("1", { visible: false })]);

    const locator = await settle(requireSignifier(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["1"]);
  });

  it("returns the unique visible element among hidden copies", async () => {
    const dom = createDom([
      addToCart("hidden-a", { visible: false }),
      addToCart("shown", { visible: true }),
      addToCart("hidden-b", { visible: false }),
    ]);

    const locator = await settle(requireSignifier(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["shown"]);
  });

  it("narrows matches by state before it checks for ambiguity", async () => {
    const dom = createDom([
      addToCart("sold-out", { visible: true, available: false }),
      addToCart("in-stock", { visible: true, available: true }),
    ]);

    const locator = await settle(
      requireSignifier(asPage(dom), "product-add-to-cart", { available: true }),
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

    const locator = await settle(requireSignifier(asPage(dom), "product-add-to-cart"));

    expect(idsOf(locator)).toEqual(["late"]);
  });

  it("allows a cart line to appear after 10 seconds within the supplied 15-second budget", async () => {
    const dom = createDom();
    const startedAt = Date.now();
    dom.onCount = () => {
      if (Date.now() - startedAt >= 12_000 && dom.elements.length === 0) {
        dom.elements.push({
          id: "late-line",
          visible: true,
          attributes: signifier("cart-line", {
            merchandiseId: "variant-1",
            quantity: 1,
            pending: false,
          }),
        });
      }
    };

    const line = await settle(
      requireSignifier(
        asPage(dom),
        "cart-line",
        { merchandiseId: "variant-1" },
        { timeout: 15_000 },
      ),
      15_000,
    );

    expect(idsOf(line)).toEqual(["late-line"]);
  });

  it("bounds a missing cart line lookup by the supplied budget and reports that budget", async () => {
    const dom = createDom();
    const startedAt = Date.now();
    let failedAt: number | undefined;
    const lookup = requireSignifier(
      asPage(dom),
      "cart-line",
      { merchandiseId: "variant-1" },
      { timeout: 15_000 },
    ).catch((error: unknown) => {
      failedAt = Date.now();
      throw error;
    });
    const error = await contractErrorFrom(lookup, 15_000);

    expect(failedAt).toBeDefined();
    expect(Number(failedAt) - startedAt).toBeLessThanOrEqual(15_000);
    expect(error.message).toContain("15000ms");
    expect(error.signifier).toMatchObject({ name: "cart-line", problem: "missing" });
    expect(error.message).toContain("lineProps(line)");
    expect(error.message).toContain("getCartLineAttributes(line, cartState)");
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

    const locator = await settle(requireSignifier(scope, "product-add-to-cart"));
    expect(idsOf(locator)).toEqual(["inside"]);

    const error = await contractErrorFrom(
      requireSignifier(scope, "product-add-to-cart", { available: false }),
    );
    expect(error.routePath).toBe("/products/shirt?Size=M");
  });

  it("reports a missing signifier with both fix paths", async () => {
    const dom = createDom([addToCart("sold-out", { visible: true, available: false })]);

    const error = await contractErrorFrom(
      requireSignifier(asPage(dom), "product-add-to-cart", { available: true }),
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

    const error = await contractErrorFrom(requireSignifier(asPage(dom), "product-add-to-cart"));

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

    await expect(settle(requireSignifier(asPage(dom), "product-add-to-cart"))).rejects.toBe(
      failure,
    );
  });
});
