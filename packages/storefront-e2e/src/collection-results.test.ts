import type { Locator, Page } from "@playwright/test";
import {
  signifierSelector,
  type AvailableFilter,
  type AvailableFilterValue,
} from "@shopify/hydrogen";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getNarrowingFilterValues,
  renderedProductCardCount,
  requireActionableCollectionFilter,
} from "./collection-results";
import { StorefrontContractError } from "./contract";
import { EXPECT_TIMEOUT_MS } from "./timeouts";

function filterValue(id: string, count: number): AvailableFilterValue {
  return { id, count, input: '{"tag":"blue"}', label: "No count or English label needed" };
}

describe("getNarrowingFilterValues", () => {
  it("retains the API value ID and input rather than the parent ID or display label", () => {
    const narrow = filterValue("value-blue", 2);
    const filters: AvailableFilter[] = [
      {
        id: "parent-color",
        label: "Couleur",
        type: "LIST",
        values: [filterValue("empty", 0), filterValue("all", 10), narrow],
      },
    ];

    expect(getNarrowingFilterValues(filters, 10)).toEqual([narrow]);
    expect(getNarrowingFilterValues(filters, 10)[0]).toBe(narrow);
  });

  it("uses the rendered page bound, not an API total, and ignores non-checkbox filters", () => {
    const filters: AvailableFilter[] = [
      { id: "price", label: "Price", type: "PRICE_RANGE", values: [filterValue("range", 2)] },
      {
        id: "availability",
        label: "Availability",
        type: "BOOLEAN",
        values: [filterValue("too-many-for-page", 20), filterValue("available", 3)],
      },
      { id: "unknown", label: "Unknown", type: "OTHER", values: [filterValue("other", 1)] },
      {
        id: "invalid",
        label: "Invalid",
        type: "LIST",
        values: [{ ...filterValue("no-input", 1), input: "" }],
      },
    ];

    expect(getNarrowingFilterValues(filters, 5).map((value) => value.id)).toEqual(["available"]);
    expect(getNarrowingFilterValues(filters, 0)).toEqual([]);
  });
});

function pageWithCards(cards: Array<{ handle: string | null; visible: boolean }>) {
  const filter = vi.fn(({ visible }: { visible: boolean }) => ({
    evaluateAll: async (read: (elements: Element[]) => unknown) =>
      read(
        cards
          .filter((card) => card.visible === visible)
          .map(
            (card) =>
              ({
                getAttribute: (attribute: string) =>
                  attribute === "data-shopify-product-handle" ? card.handle : null,
              }) as unknown as Element,
          ),
      ),
  }));
  const locator = vi.fn(() => ({ filter }));
  return {
    page: { locator, url: () => "https://shop.example/collections/all" } as unknown as Page,
    locator,
    filter,
  };
}

describe("renderedProductCardCount", () => {
  it("counts unique visible signified handles and excludes hidden copies", async () => {
    const { page, locator, filter } = pageWithCards([
      { handle: "blue", visible: true },
      { handle: "blue", visible: true },
      { handle: "red", visible: true },
      { handle: "hidden", visible: false },
    ]);

    expect(await renderedProductCardCount(page)).toBe(2);
    expect(locator).toHaveBeenCalledWith(signifierSelector("product-card"));
    expect(filter).toHaveBeenCalledWith({ visible: true });
  });

  it("reports zero for empty results, so non-empty assertions cannot pass", async () => {
    expect(await renderedProductCardCount(pageWithCards([]).page)).toBe(0);
  });

  it.each([null, ""])("rejects a card with missing identity: %s", async (handle) => {
    const { page } = pageWithCards([{ handle, visible: true }]);
    await expect(renderedProductCardCount(page)).rejects.toMatchObject({
      capability: "product-results",
      routePath: "/collections/all",
      docsAnchor: "#product-card",
      expectation: expect.stringContaining("non-empty product handle"),
      likelyFix: expect.stringContaining("getProductCardAttributes(product)"),
    });
  });
});

class NativeCheckbox {
  readonly type = "checkbox";
}

type FilterControlState = {
  readonly native?: boolean;
  readonly visible?: boolean;
  readonly labelVisible?: boolean;
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly clickable?: boolean;
};

class FakeFilterControl {
  constructor(private readonly state: FilterControlState) {}

  async evaluate(read: (element: unknown) => unknown): Promise<unknown> {
    return read(this.state.native === false ? {} : new NativeCheckbox());
  }

  async isVisible(): Promise<boolean> {
    return this.state.visible ?? true;
  }

  async isEnabled(): Promise<boolean> {
    return !this.state.disabled;
  }

  async isChecked(): Promise<boolean> {
    return this.state.checked ?? false;
  }

  async click(options: { trial: boolean; timeout: number }): Promise<void> {
    if (!options.trial) throw new Error("Candidate discovery must not click the control");
    if (this.state.clickable === false) throw new Error("Fake control cannot receive a click");
  }

  actionTarget(): Locator {
    return this.state.labelVisible
      ? ({
          isVisible: async () => true,
          click: (options: { trial: boolean; timeout: number }) => this.click(options),
        } as unknown as Locator)
      : (this as unknown as Locator);
  }
}

function pageWithFilterControls(controlsById: Record<string, FilterControlState[]>) {
  const controlsBySelector = new Map(
    Object.entries(controlsById).map(([filterId, controls]) => [
      signifierSelector("collection-filter-value", { filterId }),
      controls,
    ]),
  );
  const locator = vi.fn((selector: string) => {
    const controls = controlsBySelector.get(selector) ?? [];
    return {
      count: async () => controls.length,
      nth: (index: number) => {
        const state = controls[index];
        if (state === undefined) throw new Error(`No fake control at index ${index}`);
        return new FakeFilterControl(state);
      },
    };
  });
  return {
    page: { locator, url: () => "https://shop.example/collections/all" } as unknown as Page,
    locator,
  };
}

async function fakeFilterActionTarget({ control }: { control: Locator }): Promise<Locator> {
  return (control as unknown as FakeFilterControl).actionTarget();
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

describe("requireActionableCollectionFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
    vi.stubGlobal("HTMLInputElement", NativeCheckbox);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("accepts partial filter presentation instead of requiring the first API value", async () => {
    const { page, locator } = pageWithFilterControls({ shown: [{}] });
    const candidate = await settle(
      requireActionableCollectionFilter(
        page,
        [filterValue("not-rendered", 1), filterValue("shown", 2)],
        fakeFilterActionTarget,
      ),
    );

    expect(candidate.value.id).toBe("shown");
    expect(locator.mock.calls.map(([selector]) => selector)).toEqual([
      signifierSelector("collection-filter-value", { filterId: "not-rendered" }),
      signifierSelector("collection-filter-value", { filterId: "shown" }),
    ]);
  });

  it("uses a visible wrapping label for a visually hidden native checkbox", async () => {
    const { page } = pageWithFilterControls({ swatch: [{ visible: false, labelVisible: true }] });
    const candidate = await settle(
      requireActionableCollectionFilter(page, [filterValue("swatch", 2)], fakeFilterActionTarget),
    );

    expect(candidate.actionTarget).not.toBe(candidate.control);
  });

  it("tries later values after disabled, selected, unsupported, or hidden-only controls", async () => {
    const { page } = pageWithFilterControls({
      disabled: [{ disabled: true }],
      selected: [{ checked: true }],
      button: [{ native: false }],
      hidden: [{ visible: false }],
      clipped: [{ visible: true, clickable: false }],
      shown: [{}],
    });
    const candidate = await settle(
      requireActionableCollectionFilter(
        page,
        ["disabled", "selected", "button", "hidden", "clipped", "shown"].map((id) =>
          filterValue(id, 2),
        ),
        fakeFilterActionTarget,
      ),
    );

    expect(candidate.value.id).toBe("shown");
  });

  it.each([
    ["not-rendered", [], "no attached signifier"],
    ["label-or-button", [{ native: false }], "not on a native checkbox"],
    ["hidden", [{ visible: false }], "hidden-only"],
    ["clipped", [{ visible: true, clickable: false }], "cannot receive a click"],
    ["disabled", [{ disabled: true }], "disabled"],
    ["selected", [{ checked: true }], "already selected"],
    ["duplicate", [{}, {}], "multiple actionable checkboxes"],
  ] as const)(
    "reports why %s cannot be used, with contract remediation",
    async (id, controls, reason) => {
      const { page } = pageWithFilterControls({ [id]: [...controls] });
      const error = await settle(
        requireActionableCollectionFilter(
          page,
          [filterValue("also-missing", 1), filterValue(id, 2)],
          fakeFilterActionTarget,
        ),
      ).catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(StorefrontContractError);
      if (!(error instanceof StorefrontContractError)) throw new Error("Expected a contract error");
      expect(error.capability).toBe("collection-filter");
      expect(error.docsAnchor).toBe("#collection-filter-value");
      expect(error.routePath).toBe("/collections/all");
      expect(error.message).toContain(`${id}:`);
      expect(error.message).toContain(reason);
      expect(error.message).toContain("also-missing: no attached signifier");
      expect(error.likelyFix).toContain("getFilterValueAttributes(value)");
    },
  );
});
