// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";

import { createCollectionStore, type CollectionData, type CollectionStore } from "../collection";

function testData(handle = "shoes", dataSearch = ""): CollectionData {
  return { handle, dataSearch };
}

function createTestStore(options: { urlSearch?: string; data?: CollectionData } = {}) {
  return createCollectionStore({
    data: options.data ?? testData(),
    urlSearch: options.urlSearch,
  });
}

function submitForm(fields: Record<string, string> | Array<[string, string]>): SubmitEvent {
  const entries = Array.isArray(fields) ? fields : Object.entries(fields);
  const form = document.createElement("form");
  for (const [name, value] of entries) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const button = document.createElement("button");
  button.type = "submit";
  form.appendChild(button);
  document.body.appendChild(form);

  let capturedEvent!: SubmitEvent;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    capturedEvent = e;
  });
  button.click();

  document.body.removeChild(form);
  return capturedEvent;
}

let store: CollectionStore;

describe("createCollectionStore", () => {
  it("creates store with default state", () => {
    store = createTestStore();
    const state = store.getState();

    expect(state.handle).toBe("shoes");
    expect(state.filters).toEqual([]);
    expect(state.sortKey).toBeUndefined();
    expect(state.reverse).toBe(false);
    expect(state.status).toBe("idle");
  });

  it("parses search into initial state", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men&sort_by=price-ascending" });
    const state = store.getState();

    expect(state.filters).toEqual([{ tag: "men" }]);
    expect(state.sortKey).toBe("PRICE");
    expect(state.reverse).toBe(false);
  });

  it("parses reverse sort from search", () => {
    store = createTestStore({ urlSearch: "sort_by=price-descending" });

    expect(store.getState().sortKey).toBe("PRICE");
    expect(store.getState().reverse).toBe(true);
  });
});

describe("browse changes", () => {
  it("setFilters updates filters and sets status to loading", () => {
    store = createTestStore();
    store.setFilters([{ tag: "men" }]);

    expect(store.getState().filters).toEqual([{ tag: "men" }]);
    expect(store.getState().status).toBe("loading");
  });

  it("setFilters with empty array clears filters", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men" });

    store.setFilters([]);

    expect(store.getState().filters).toEqual([]);
    expect(store.getState().status).toBe("loading");
  });

  it("setFilters drops contradictory availability filters", () => {
    store = createTestStore();

    store.setFilters([{ available: true }, { tag: "sale" }, { available: false }]);

    expect(store.getState().filters).toEqual([{ tag: "sale" }]);
  });

  it("setFilters drops both availability filters when both true and false are present", () => {
    store = createTestStore();

    store.setFilters([{ available: true }, { available: false }]);

    expect(store.getState().filters).toEqual([]);
  });

  it("setSortKey updates sort and sets status to loading", () => {
    store = createTestStore();
    store.setSortKey("PRICE", true);

    expect(store.getState().sortKey).toBe("PRICE");
    expect(store.getState().reverse).toBe(true);
    expect(store.getState().status).toBe("loading");
  });

  it("setSortKey defaults reverse to false", () => {
    store = createTestStore();
    store.setSortKey("TITLE");

    expect(store.getState().reverse).toBe(false);
  });

  it("normalizes reverse to false for non-directional sort keys", () => {
    store = createTestStore();
    store.setSortKey("BEST_SELLING", true);

    expect(store.getState().sortKey).toBe("BEST_SELLING");
    expect(store.getState().reverse).toBe(false);
  });

  it("preserves reverse for directional sort keys", () => {
    store = createTestStore();
    store.setSortKey("PRICE", true);

    expect(store.getState().reverse).toBe(true);
  });

  it("browse changes do not update the browser URL", () => {
    store = createTestStore();
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    store.setFilters([{ tag: "men" }]);
    store.setSortKey("PRICE", false);

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });
});

describe("settle", () => {
  it("resets status from loading to idle", () => {
    store = createTestStore();
    store.setFilters([{ tag: "men" }]);

    expect(store.getState().status).toBe("loading");

    store.settle();

    expect(store.getState().status).toBe("idle");
  });

  it("is a no-op when already idle", () => {
    store = createTestStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.settle();

    expect(store.getState().status).toBe("idle");
    expect(listener).not.toHaveBeenCalled();
  });

  it("preserves browse state when settling", () => {
    store = createTestStore();
    store.setFilters([{ tag: "men" }]);
    store.setSortKey("PRICE", true);

    store.settle();

    const state = store.getState();
    expect(state.filters).toEqual([{ tag: "men" }]);
    expect(state.sortKey).toBe("PRICE");
    expect(state.reverse).toBe(true);
    expect(state.status).toBe("idle");
  });
});

describe("reset", () => {
  it("resets filters and sort to defaults", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men&sort_by=price-ascending" });

    store.reset();

    const state = store.getState();
    expect(state.filters).toEqual([]);
    expect(state.sortKey).toBeUndefined();
    expect(state.reverse).toBe(false);
    expect(state.status).toBe("loading");
  });

  it("preserves handle", () => {
    store = createTestStore();
    store.setFilters([{ tag: "men" }]);
    store.reset();

    expect(store.getState().handle).toBe("shoes");
  });
});

describe("syncFromParams", () => {
  it("does not re-enter loading while already loading", () => {
    store = createTestStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setFilters([{ tag: "men" }]);
    expect(listener).toHaveBeenCalledTimes(1);

    store.syncFromParams(new URLSearchParams("filter.p.tag=men"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("loading");
  });

  it("re-parses URL into state", () => {
    store = createTestStore();

    store.syncFromParams(new URLSearchParams("filter.p.tag=men"));

    expect(store.getState().filters).toEqual([{ tag: "men" }]);
    expect(store.getState().status).toBe("loading");
  });

  it("clears state when syncing empty params", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men" });

    store.syncFromParams(new URLSearchParams(""));

    expect(store.getState().filters).toEqual([]);
    expect(store.getState().status).toBe("loading");
  });

  it("preserves handle when syncing", () => {
    store = createTestStore();

    store.syncFromParams(new URLSearchParams("filter.p.tag=women"));

    expect(store.getState().handle).toBe("shoes");
  });

  it("normalizes reverse to false for non-directional sort keys from URL", () => {
    store = createTestStore();

    store.syncFromParams(new URLSearchParams("sort_by=best-selling-descending"));

    expect(store.getState().reverse).toBe(false);
  });
});

describe("handleFormSubmit", () => {
  it("serializes form data and applies browse change", () => {
    store = createTestStore();

    const event = submitForm({
      "filter.p.tag": "men",
      sort_by: "price-ascending",
    });
    store.handleFormSubmit(event);

    expect(store.getState().filters).toEqual([{ tag: "men" }]);
    expect(store.getState().sortKey).toBe("PRICE");
    expect(store.getState().reverse).toBe(false);
    expect(store.getState().status).toBe("loading");
  });

  it("preserves sort when form only contains filters", () => {
    store = createTestStore();
    store.setSortKey("PRICE", true);

    const event = submitForm({ "filter.p.tag": "men" });
    store.handleFormSubmit(event);

    expect(store.getState().filters).toEqual([{ tag: "men" }]);
    expect(store.getState().sortKey).toBe("PRICE");
    expect(store.getState().reverse).toBe(true);
  });

  it("overrides sort when form includes sort_by", () => {
    store = createTestStore();
    store.setSortKey("PRICE", false);

    const event = submitForm({
      "filter.p.tag": "men",
      sort_by: "title-descending",
    });
    store.handleFormSubmit(event);

    expect(store.getState().sortKey).toBe("TITLE");
    expect(store.getState().reverse).toBe(true);
  });

  it("clears filters when form has no filter inputs", () => {
    store = createTestStore();
    store.setFilters([{ tag: "men" }, { tag: "women" }]);

    const event = submitForm({ sort_by: "price-ascending" });
    store.handleFormSubmit(event);

    expect(store.getState().filters).toEqual([]);
    expect(store.getState().sortKey).toBe("PRICE");
  });

  it("clears availability when form submits both in-stock and out-of-stock", () => {
    store = createTestStore();
    store.setFilters([{ available: true }]);

    const event = submitForm([
      ["filter.v.availability", "1"],
      ["filter.v.availability", "0"],
    ]);
    store.handleFormSubmit(event);

    expect(store.getState().filters).toEqual([]);
  });

  it("throws on non-form target", () => {
    store = createTestStore();

    const fakeEvent = new Event("submit") as SubmitEvent;
    Object.defineProperty(fakeEvent, "target", { value: null });

    expect(() => store.handleFormSubmit(fakeEvent)).toThrow(TypeError);
  });
});

describe("toggleFilter", () => {
  it("adds a filter that is not active", () => {
    store = createTestStore();
    store.toggleFilter({ tag: "men" });

    expect(store.getState().filters).toEqual([{ tag: "men" }]);
    expect(store.getState().status).toBe("loading");
  });

  it("removes a filter that is already active", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men&filter.p.tag=women" });

    store.toggleFilter({ tag: "men" });

    expect(store.getState().filters).toEqual([{ tag: "women" }]);
    expect(store.getState().status).toBe("loading");
  });

  it("toggles complex filters (variant option)", () => {
    store = createTestStore();

    const filter = { variantOption: { name: "Color", value: "Red" } };
    store.toggleFilter(filter);
    expect(store.getState().filters).toEqual([filter]);

    store.toggleFilter(filter);
    expect(store.getState().filters).toEqual([]);
  });

  it("preserves other filters when toggling", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men&filter.p.vendor=Nike" });

    store.toggleFilter({ tag: "men" });

    expect(store.getState().filters).toEqual([{ productVendor: "Nike" }]);
  });

  it("preserves sort when toggling", () => {
    store = createTestStore({ urlSearch: "sort_by=price-ascending" });

    store.toggleFilter({ tag: "sale" });

    expect(store.getState().sortKey).toBe("PRICE");
  });

  it("removes a URL-parsed filter when toggling with API-shaped input", () => {
    store = createTestStore({ urlSearch: "filter.v.price.gte=10&filter.v.price.lte=100" });

    store.toggleFilter({ price: { min: 10, max: 100 } });

    expect(store.getState().filters).toEqual([]);
  });

  it("clears availability when toggling to the opposite value", () => {
    store = createTestStore({ urlSearch: "filter.v.availability=1&filter.p.tag=sale" });

    store.toggleFilter({ available: false });

    expect(store.getState().filters).toEqual([{ tag: "sale" }]);
    expect(store.serializeToParams().has("filter.v.availability")).toBe(false);
  });
});

describe("subscribe", () => {
  it("notifies listeners on state change", () => {
    store = createTestStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setFilters([{ tag: "men" }]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ tag: "men" }] }));
  });

  it("unsubscribe stops notifications", () => {
    store = createTestStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    unsub();
    store.setFilters([{ tag: "men" }]);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("getFilterRemovalUrl", () => {
  it("returns URL with the specified filter removed", () => {
    store = createTestStore({
      urlSearch: "filter.p.tag=men&filter.p.tag=women&sort_by=price-ascending",
    });

    const url = store.getFilterRemovalUrl({ tag: "men" });
    expect(url).toContain("filter.p.tag=women");
    expect(url).toContain("sort_by=price-ascending");
    expect(url).not.toContain("filter.p.tag=men");
  });
});

describe("serializeToParams", () => {
  it("serializes current state to URLSearchParams", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=men&sort_by=price-ascending" });

    const params = store.serializeToParams();
    expect(params.get("filter.p.tag")).toBe("men");
    expect(params.get("sort_by")).toBe("price-ascending");
  });
});

describe("onBrowseChange", () => {
  it("fires after setFilters", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.setFilters([{ tag: "men" }]);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after toggleFilter", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.toggleFilter({ tag: "sale" });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after setSortKey", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.setSortKey("PRICE", true);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after reset", () => {
    const callback = vi.fn();
    store = createCollectionStore({
      data: testData(),
      urlSearch: "filter.p.tag=men",
      onBrowseChange: callback,
    });
    callback.mockClear();

    store.reset();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after handleFormSubmit", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    const event = submitForm({ "filter.p.tag": "men" });
    store.handleFormSubmit(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after toggleFilterInput", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.toggleFilterInput('{"tag":"sale"}');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after setSortByValue", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.setSortByValue("price-descending");

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire after syncFromParams", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.syncFromParams(new URLSearchParams("filter.p.tag=men"));

    expect(callback).not.toHaveBeenCalled();
  });

  it("does NOT fire after settle", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });
    store.setFilters([{ tag: "men" }]);
    callback.mockClear();

    store.settle();

    expect(callback).not.toHaveBeenCalled();
  });

  it("setOnBrowseChange replaces the callback", () => {
    const first = vi.fn();
    const second = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: first });

    store.setOnBrowseChange(second);
    store.setFilters([{ tag: "women" }]);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("setOnBrowseChange(null) removes the callback", () => {
    const callback = vi.fn();
    store = createCollectionStore({ data: testData(), onBrowseChange: callback });

    store.setOnBrowseChange(null);
    store.setFilters([{ tag: "women" }]);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe("toggleFilterInput", () => {
  it("parses JSON and toggles the filter", () => {
    store = createTestStore();

    store.toggleFilterInput('{"tag":"sale"}');

    expect(store.getState().filters).toEqual([{ tag: "sale" }]);
    expect(store.getState().status).toBe("loading");
  });

  it("removes the filter if already active", () => {
    store = createTestStore({ urlSearch: "filter.p.tag=sale" });

    store.toggleFilterInput('{"tag":"sale"}');

    expect(store.getState().filters).toEqual([]);
  });

  it("is a no-op for invalid JSON", () => {
    store = createTestStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.toggleFilterInput("not-json");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("setSortByValue", () => {
  it("parses sort_by value and applies sort", () => {
    store = createTestStore();

    store.setSortByValue("price-descending");

    expect(store.getState().sortKey).toBe("PRICE");
    expect(store.getState().reverse).toBe(true);
    expect(store.getState().status).toBe("loading");
  });

  it("falls back to COLLECTION_DEFAULT for unknown values", () => {
    store = createTestStore();

    store.setSortByValue("nonexistent");

    expect(store.getState().sortKey).toBe("COLLECTION_DEFAULT");
    expect(store.getState().reverse).toBe(false);
  });

  it("handles ascending suffix", () => {
    store = createTestStore();

    store.setSortByValue("title-ascending");

    expect(store.getState().sortKey).toBe("TITLE");
    expect(store.getState().reverse).toBe(false);
  });
});
