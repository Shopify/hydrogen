// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type * as CollectionModule from "../core/collection";
import type { CollectionStore } from "../core/collection";
import { createCollectionStore } from "../core/collection";
import type { CollectionState } from "../core/collection/state";
import type * as CollectionUrlModule from "../core/collection/url";
import { mergeCollectionParams } from "../core/collection/url";
import {
  CollectionProvider,
  useCollection,
  useCollectionActions,
  useCollectionForm,
} from "./collection";

vi.mock("../core/collection", async (importOriginal) => {
  const actual = await importOriginal<typeof CollectionModule>();
  return {
    ...actual,
    createCollectionStore: vi.fn(),
  };
});

vi.mock("../core/collection/url", async (importOriginal) => {
  const actual = await importOriginal<typeof CollectionUrlModule>();
  return {
    ...actual,
    mergeCollectionParams: vi.fn(() => new URLSearchParams()),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCollectionState(
  handle: string,
  overrides: Partial<CollectionState> = {},
): CollectionState {
  return {
    handle,
    filters: [],
    sortKey: undefined,
    reverse: false,
    status: "idle",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

type MockCollectionStore = CollectionStore & {
  setState(state: CollectionState): void;
};

let latestStore: MockCollectionStore;
let subscribeListener: (() => void) | null = null;

const shoesData = { handle: "shoes", dataSearch: "" };
const hatsData = { handle: "hats", dataSearch: "" };

function createMockStore(handle = "shoes"): MockCollectionStore {
  let state = makeCollectionState(handle);
  let browseChangeCallback: (() => void) | null = null;
  const store = {
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: () => void) => {
      subscribeListener = fn;
      return () => {
        subscribeListener = null;
      };
    }),
    setFilters: vi.fn(() => browseChangeCallback?.()),
    toggleFilter: vi.fn(() => browseChangeCallback?.()),
    toggleFilterInput: vi.fn(() => browseChangeCallback?.()),
    setSortKey: vi.fn(() => browseChangeCallback?.()),
    setSortByValue: vi.fn(() => browseChangeCallback?.()),
    reset: vi.fn(() => browseChangeCallback?.()),
    handleFormSubmit: vi.fn(() => browseChangeCallback?.()),
    matchesParams: vi.fn(() => false),
    syncFromParams: vi.fn(),
    settle: vi.fn(),
    getFilterRemovalUrl: vi.fn(() => "?"),
    serializeToParams: vi.fn(() => new URLSearchParams()),
    setOnBrowseChange: vi.fn((cb: (() => void) | null) => {
      browseChangeCallback = cb;
    }),
    setState(next: CollectionState) {
      state = next;
      subscribeListener?.();
    },
  } as unknown as MockCollectionStore;

  latestStore = store;
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeListener = null;
  vi.mocked(createCollectionStore).mockImplementation(() => createMockStore());
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CollectionProvider, { data: shoesData }, children);
}

// ---------------------------------------------------------------------------
// CollectionProvider
// ---------------------------------------------------------------------------

describe("CollectionProvider", () => {
  it("creates a store with the given handle", () => {
    renderHook(() => useCollection(), { wrapper });

    expect(createCollectionStore).toHaveBeenCalledWith(
      expect.objectContaining({ data: shoesData }),
    );
  });

  it("passes urlSearch to the store factory", () => {
    const customWrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        CollectionProvider,
        { data: hatsData, urlSearch: "sort_by=price-ascending" },
        children,
      );

    vi.mocked(createCollectionStore).mockImplementation(() => createMockStore("hats"));
    renderHook(() => useCollection(), { wrapper: customWrapper });

    expect(createCollectionStore).toHaveBeenCalledWith({
      data: hatsData,
      urlSearch: "sort_by=price-ascending",
    });
  });

  it("creates a new store when handle changes", () => {
    let data = shoesData;

    const dynamicWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data }, children);

    const { rerender } = renderHook(() => useCollection(), { wrapper: dynamicWrapper });

    const firstStore = latestStore;

    data = hatsData;
    rerender();

    expect(latestStore).not.toBe(firstStore);
  });

  it("calls onChange with serialized search string after a browse change", () => {
    const onChange = vi.fn();
    const merged = new URLSearchParams("filter.p.tag=sale");
    vi.mocked(mergeCollectionParams).mockReturnValueOnce(merged);

    const onChangeWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: shoesData, onChange }, children);

    const { result } = renderHook(() => useCollectionActions(), { wrapper: onChangeWrapper });

    act(() => {
      result.current.toggleFilter({ tag: "sale" });
    });

    expect(onChange).toHaveBeenCalledWith("?filter.p.tag=sale");
  });

  it("syncs store from external urlSearch prop changes", () => {
    let urlSearch = "";

    const syncWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: shoesData, urlSearch }, children);

    const { rerender } = renderHook(() => useCollection(), { wrapper: syncWrapper });

    urlSearch = "sort_by=price-ascending";
    rerender();

    expect(latestStore.syncFromParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  it("settles when urlSearch and data.dataSearch match", () => {
    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      vi.mocked(mockStore.matchesParams).mockReturnValue(true);
      mockStore.setState(makeCollectionState("shoes", { status: "loading" }));
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const loaderData = {
      handle: "shoes",
      dataSearch: "filter.p.tag=sale",
    };
    const settleWrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        CollectionProvider,
        {
          data: loaderData,
          urlSearch: "filter.p.tag=sale",
        },
        children,
      );

    renderHook(() => useCollection(), { wrapper: settleWrapper });

    expect(latestStore.settle).toHaveBeenCalledWith();
  });

  it("does not call syncFromParams while navigation is pending", () => {
    const loaderData = { handle: "shoes", dataSearch: "" };
    const pendingWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch: "" }, children);

    const { result } = renderHook(() => useCollectionActions(), { wrapper: pendingWrapper });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);
    vi.mocked(latestStore.syncFromParams).mockClear();

    act(() => {
      result.current.toggleFilter({ tag: "sale" });
    });

    expect(latestStore.syncFromParams).not.toHaveBeenCalled();
  });

  it("syncs from URL when link navigation supersedes pending onChange", () => {
    const onChange = vi.fn();
    const merged = new URLSearchParams("filter.p.tag=sale");
    vi.mocked(mergeCollectionParams).mockReturnValue(merged);

    let urlSearch = "filter.p.tag=sale";
    const loaderData = { handle: "shoes", dataSearch: "filter.p.tag=sale" };

    const supersedeWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: supersedeWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);
    vi.mocked(latestStore.syncFromParams).mockClear();

    act(() => {
      result.current.toggleFilter({ tag: "men" });
    });

    expect(latestStore.syncFromParams).not.toHaveBeenCalled();

    urlSearch = "";
    rerender();

    expect(latestStore.syncFromParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  it("settles after link navigation when loader data already matches URL", async () => {
    const { createCollectionStore: realCreateCollectionStore } =
      await vi.importActual<typeof CollectionModule>("../core/collection");
    vi.mocked(createCollectionStore).mockImplementation(realCreateCollectionStore);

    let urlSearch = "filter.p.tag=sale";
    let loaderData = { handle: "shoes", dataSearch: "filter.p.tag=sale" };

    const linkWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch }, children);

    const { result, rerender } = renderHook(() => useCollection(), { wrapper: linkWrapper });

    expect(result.current.status).toBe("idle");
    expect(result.current.filters).toEqual([{ tag: "sale" }]);

    loaderData = { handle: "shoes", dataSearch: "" };
    urlSearch = "";
    rerender();

    expect(result.current.status).toBe("idle");
    expect(result.current.filters).toEqual([]);
  });

  it("ignores intermediate URLs during rapid filter toggling", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    const loaderData = { handle: "shoes", dataSearch: "" };

    const rapidWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A&filter.p.tag=B"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: rapidWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    act(() => {
      result.current.toggleFilter({ tag: "A" });
      result.current.toggleFilter({ tag: "B" });
      result.current.toggleFilter({ tag: "A" });
    });

    vi.mocked(latestStore.syncFromParams).mockClear();

    // Intermediate URL from step 2 arrives — should be ignored, not synced
    urlSearch = "filter.p.tag=A&filter.p.tag=B";
    rerender();

    expect(latestStore.syncFromParams).not.toHaveBeenCalled();
  });

  it("settles when final URL arrives after intermediate URLs", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const settleWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: settleWrapper,
    });

    act(() => {
      result.current.toggleFilter({ tag: "A" });
      result.current.toggleFilter({ tag: "B" });
    });

    // Intermediate URL arrives — ignored
    urlSearch = "filter.p.tag=A";
    rerender();

    expect(latestStore.settle).not.toHaveBeenCalled();

    // Final URL arrives with matching server data
    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    urlSearch = "filter.p.tag=B";
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=B" };
    rerender();

    expect(latestStore.settle).toHaveBeenCalled();
  });

  it("handles external navigation during a pending browse-change chain", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    const loaderData = { handle: "shoes", dataSearch: "" };

    const externalWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams).mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: externalWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    act(() => {
      result.current.toggleFilter({ tag: "A" });
    });

    vi.mocked(latestStore.syncFromParams).mockClear();

    // External navigation (back/forward) to a URL we never navigated to
    urlSearch = "sort_by=price-ascending";
    rerender();

    expect(latestStore.syncFromParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  it("clears navigation history on settle so subsequent operations are clean", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const cleanupWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams).mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: cleanupWrapper,
    });

    // Complete a browse-change chain
    act(() => {
      result.current.toggleFilter({ tag: "A" });
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    urlSearch = "filter.p.tag=A";
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=A" };
    rerender();

    expect(latestStore.settle).toHaveBeenCalled();

    // Now navigate externally to "filter.p.tag=A" — should NOT be treated
    // as intermediate (stale set entry) since the set was cleared on settle
    vi.mocked(latestStore.matchesParams).mockReturnValue(false);
    vi.mocked(latestStore.syncFromParams).mockClear();

    urlSearch = "sort_by=best-selling";
    loaderData = { handle: "shoes", dataSearch: "sort_by=best-selling" };
    rerender();

    expect(latestStore.syncFromParams).toHaveBeenCalled();
  });

  it("re-dispatches when client URL reaches target before server data catches up", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const targetWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A&filter.p.tag=B"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: targetWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    act(() => {
      result.current.toggleFilter({ tag: "A" });
      result.current.toggleFilter({ tag: "B" });
      result.current.toggleFilter({ tag: "A" });
    });

    onChange.mockClear();

    // Next.js updates useSearchParams before RSC returns; dataSearch is still stale.
    urlSearch = "filter.p.tag=B";
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=A&filter.p.tag=B" };
    rerender();

    expect(onChange).toHaveBeenCalledWith("?filter.p.tag=B");

    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=B" };
    rerender();

    expect(latestStore.settle).toHaveBeenCalled();
  });

  it("re-dispatches when an earlier intermediate URL arrives with matching server data", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    const earlyIntermediateWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A&filter.p.tag=B"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: earlyIntermediateWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    act(() => {
      result.current.toggleFilter({ tag: "A" });
      result.current.toggleFilter({ tag: "B" });
      result.current.toggleFilter({ tag: "A" });
    });

    onChange.mockClear();

    // Step 1 URL lands after step 3 already targeted Beige-only.
    urlSearch = "filter.p.tag=A";
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=A" };
    rerender();

    expect(onChange).toHaveBeenCalledWith("?filter.p.tag=B");
  });

  it("re-dispatches navigation when router settles at an intermediate URL", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const staleWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A&filter.p.tag=B"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: staleWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    act(() => {
      result.current.toggleFilter({ tag: "A" });
      result.current.toggleFilter({ tag: "B" });
      result.current.toggleFilter({ tag: "A" });
    });

    onChange.mockClear();

    // Router settles at intermediate URL (Next.js cancelled the final navigation)
    urlSearch = "filter.p.tag=A&filter.p.tag=B";
    rerender();

    // Server responds with data matching the intermediate URL — URL is stable,
    // so urlSearchChanged is false, but dataSearch changed.
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=A&filter.p.tag=B" };
    rerender();

    // Effect should re-dispatch navigation to the correct target
    expect(onChange).toHaveBeenCalledWith("?filter.p.tag=B");

    // Now the router processes the re-dispatched navigation
    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    urlSearch = "filter.p.tag=B";
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=B" };
    rerender();

    expect(latestStore.settle).toHaveBeenCalled();
  });

  it("settles when dataSearch catches up after URL arrives optimistically", () => {
    const onChange = vi.fn();

    let urlSearch = "";
    let loaderData = { handle: "shoes", dataSearch: "" };

    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      mockStore.settle = vi.fn(() => {
        mockStore.setState(makeCollectionState("shoes", { status: "idle" }));
      });
      return mockStore;
    });

    const actionsWrapper = ({ children }: { children: ReactNode }) =>
      createElement(CollectionProvider, { data: loaderData, urlSearch, onChange }, children);

    vi.mocked(mergeCollectionParams).mockReturnValueOnce(new URLSearchParams("filter.p.tag=sale"));

    const { result, rerender } = renderHook(() => useCollectionActions(), {
      wrapper: actionsWrapper,
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(true);
    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));

    act(() => {
      result.current.toggleFilter({ tag: "sale" });
    });

    // URL updates optimistically (Next.js replaceState) before server data arrives.
    // dataSearch is still stale from the previous server response.
    urlSearch = "filter.p.tag=sale";
    loaderData = { handle: "shoes", dataSearch: "" };
    rerender();

    // trySettleFromServer fails because dataSearch doesn't match yet
    expect(latestStore.settle).not.toHaveBeenCalled();

    // Server responds — dataSearch catches up to the URL
    loaderData = { handle: "shoes", dataSearch: "filter.p.tag=sale" };
    rerender();

    expect(latestStore.settle).toHaveBeenCalled();
  });

  it("does not settle when data.dataSearch does not match urlSearch", () => {
    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      vi.mocked(mockStore.matchesParams).mockReturnValue(true);
      mockStore.setState(makeCollectionState("shoes", { status: "loading" }));
      return mockStore;
    });

    const loaderData = {
      handle: "shoes",
      dataSearch: "filter.p.tag=men",
    };
    const settleWrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        CollectionProvider,
        {
          data: loaderData,
          urlSearch: "filter.p.tag=sale",
        },
        children,
      );

    renderHook(() => useCollection(), { wrapper: settleWrapper });

    expect(latestStore.settle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCollection
// ---------------------------------------------------------------------------

describe("useCollection", () => {
  it("returns the full collection state when called without a selector", () => {
    const { result } = renderHook(() => useCollection(), { wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({ handle: "shoes", status: "idle", filters: [] }),
    );
  });

  it("returns a selected slice when given a selector", () => {
    const { result } = renderHook(() => useCollection((s) => s.status), { wrapper });
    expect(result.current).toBe("idle");
  });

  it("re-renders when state changes", () => {
    const { result } = renderHook(() => useCollection((s) => s.status), { wrapper });

    expect(result.current).toBe("idle");

    act(() => {
      latestStore.setState(makeCollectionState("shoes", { status: "loading" }));
    });

    expect(result.current).toBe("loading");
  });

  it("skips re-render when isEqual returns true", () => {
    const alwaysEqual = vi.fn(() => true);

    const { result } = renderHook(() => useCollection((s) => ({ status: s.status }), alwaysEqual), {
      wrapper,
    });

    const firstValue = result.current;

    act(() => {
      latestStore.setState(makeCollectionState("shoes", { status: "loading" }));
    });

    expect(result.current).toBe(firstValue);
    expect(alwaysEqual).toHaveBeenCalled();
  });

  it("throws when used outside a CollectionProvider", () => {
    expect(() => renderHook(() => useCollection())).toThrow(
      "useCollection must be used inside a <CollectionProvider>",
    );
  });
});

// ---------------------------------------------------------------------------
// useCollectionActions
// ---------------------------------------------------------------------------

describe("useCollectionActions", () => {
  it("setFilters calls store.setFilters", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.setFilters([{ tag: "men" }]);
    });

    expect(latestStore.setFilters).toHaveBeenCalledWith([{ tag: "men" }]);
  });

  it("setSortKey calls store.setSortKey", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.setSortKey("PRICE", true);
    });

    expect(latestStore.setSortKey).toHaveBeenCalledWith("PRICE", true);
  });

  it("toggleFilter calls store.toggleFilter", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.toggleFilter({ tag: "sale" });
    });

    expect(latestStore.toggleFilter).toHaveBeenCalledWith({ tag: "sale" });
  });

  it("toggleFilterInput delegates to store.toggleFilterInput", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.toggleFilterInput('{"tag":"sale"}');
    });

    expect(latestStore.toggleFilterInput).toHaveBeenCalledWith('{"tag":"sale"}');
  });

  it("setSortByValue delegates to store.setSortByValue", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.setSortByValue("price-descending");
    });

    expect(latestStore.setSortByValue).toHaveBeenCalledWith("price-descending");
  });

  it("reset calls store.reset", () => {
    const { result } = renderHook(() => useCollectionActions(), { wrapper });

    act(() => {
      result.current.reset();
    });

    expect(latestStore.reset).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCollectionForm
// ---------------------------------------------------------------------------

describe("useCollectionForm", () => {
  it("returns a formProps function", () => {
    const { result } = renderHook(() => useCollectionForm(), { wrapper });
    expect(typeof result.current.formProps).toBe("function");
  });

  it("calls handleFormSubmit with the native event on submit", () => {
    const { result } = renderHook(() => useCollectionForm(), { wrapper });
    const props = result.current.formProps();

    const nativeEvent = new Event("submit") as unknown as globalThis.SubmitEvent;
    const syntheticEvent = {
      nativeEvent,
      defaultPrevented: false,
      preventDefault: vi.fn(),
    } as any;

    act(() => {
      (props.onSubmit as Function)(syntheticEvent);
    });

    expect(syntheticEvent.preventDefault).toHaveBeenCalled();
    expect(latestStore.handleFormSubmit).toHaveBeenCalledWith(nativeEvent);
  });

  it("calls beforeSubmit and afterSubmit callbacks", () => {
    const order: string[] = [];
    const beforeSubmit = vi.fn(() => order.push("before"));
    const afterSubmit = vi.fn(() => order.push("after"));

    const { result } = renderHook(() => useCollectionForm(), { wrapper });
    const props = result.current.formProps({ beforeSubmit, afterSubmit });

    const syntheticEvent = {
      nativeEvent: new Event("submit"),
      defaultPrevented: false,
      preventDefault: vi.fn(),
    } as any;

    act(() => {
      (props.onSubmit as Function)(syntheticEvent);
    });

    expect(order).toEqual(["before", "after"]);
  });

  it("does not call handleFormSubmit when defaultPrevented", () => {
    const { result } = renderHook(() => useCollectionForm(), { wrapper });
    const props = result.current.formProps({
      beforeSubmit: (e: any) => {
        e.defaultPrevented = true;
      },
    });

    const syntheticEvent = {
      nativeEvent: new Event("submit"),
      defaultPrevented: false,
      preventDefault: vi.fn(),
    } as any;

    act(() => {
      (props.onSubmit as Function)(syntheticEvent);
    });

    expect(latestStore.handleFormSubmit).not.toHaveBeenCalled();
  });

  it("throws when used outside a CollectionProvider", () => {
    expect(() => renderHook(() => useCollectionForm())).toThrow(
      "must be used inside a <CollectionProvider>",
    );
  });
});
