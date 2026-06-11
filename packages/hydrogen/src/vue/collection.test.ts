// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import type { CollectionStore } from "../core/collection";
import { createCollectionStore } from "../core/collection";
import type { CollectionState } from "../core/collection/state";
import { mergeCollectionParams } from "../core/collection/url";
import {
  CollectionProvider,
  useCollection,
  useCollectionActions,
  useCollectionForm,
} from "./collection";

vi.mock("../core/collection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/collection")>();
  return {
    ...actual,
    createCollectionStore: vi.fn(),
  };
});

vi.mock("../core/collection/url", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/collection/url")>();
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
let subscribeListener: ((state: CollectionState) => void) | null = null;

const shoesData = { handle: "shoes", dataSearch: "" };
const hatsData = { handle: "hats", dataSearch: "" };

function createMockStore(handle = "shoes"): MockCollectionStore {
  let state = makeCollectionState(handle);
  let browseChangeCallback: (() => void) | null = null;
  const store = {
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: (state: CollectionState) => void) => {
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
      subscribeListener?.(state);
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

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mountWithConsumer<T>(
  setupFn: () => { exposed: T; render: () => ReturnType<typeof h> | null },
  providerProps?: Record<string, unknown>,
): T {
  let captured: T | undefined;
  const Consumer = defineComponent({
    setup() {
      const { exposed, render } = setupFn();
      captured = exposed;
      return render;
    },
  });
  mount(CollectionProvider, {
    props: { data: shoesData, ...providerProps },
    slots: { default: () => h(Consumer) },
  });
  if (captured === undefined) throw new Error("mountWithConsumer: setup was never called");
  return captured;
}

// ---------------------------------------------------------------------------
// CollectionProvider
// ---------------------------------------------------------------------------

describe("CollectionProvider", () => {
  it("creates a store with the given handle", () => {
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    expect(createCollectionStore).toHaveBeenCalledWith(
      expect.objectContaining({ data: shoesData }),
    );
  });

  it("passes urlSearch to the store factory", () => {
    vi.mocked(createCollectionStore).mockImplementation(() => createMockStore("hats"));
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    mount(CollectionProvider, {
      props: { data: hatsData, urlSearch: "sort_by=price-ascending" },
      slots: { default: () => h(Consumer) },
    });

    expect(createCollectionStore).toHaveBeenCalledWith({
      data: hatsData,
      urlSearch: "sort_by=price-ascending",
    });
  });

  it("creates a new store when handle changes", async () => {
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    const firstStore = latestStore;

    await wrapper.setProps({ data: hatsData });

    expect(latestStore).not.toBe(firstStore);
  });

  it("emits change with serialized search string after a browse change", () => {
    const merged = new URLSearchParams("filter.p.tag=sale");
    vi.mocked(mergeCollectionParams).mockReturnValueOnce(merged);

    let actions: ReturnType<typeof useCollectionActions> | undefined;
    const Consumer = defineComponent({
      setup() {
        actions = useCollectionActions();
        return () => null;
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    actions?.toggleFilter({ tag: "sale" });

    expect(wrapper.emitted("change")).toEqual([["?filter.p.tag=sale"]]);
  });

  it("syncs store from external urlSearch prop changes", async () => {
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData, urlSearch: "" },
      slots: { default: () => h(Consumer) },
    });

    await wrapper.setProps({ urlSearch: "sort_by=price-ascending" });

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

    const loaderData = { handle: "shoes", dataSearch: "filter.p.tag=sale" };
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    mount(CollectionProvider, {
      props: { data: loaderData, urlSearch: "filter.p.tag=sale" },
      slots: { default: () => h(Consumer) },
    });

    expect(latestStore.settle).toHaveBeenCalled();
  });

  it("does not settle when data.dataSearch does not match urlSearch", () => {
    vi.mocked(createCollectionStore).mockImplementation(() => {
      const mockStore = createMockStore();
      vi.mocked(mockStore.matchesParams).mockReturnValue(true);
      mockStore.setState(makeCollectionState("shoes", { status: "loading" }));
      return mockStore;
    });

    const loaderData = { handle: "shoes", dataSearch: "filter.p.tag=men" };
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    mount(CollectionProvider, {
      props: { data: loaderData, urlSearch: "filter.p.tag=sale" },
      slots: { default: () => h(Consumer) },
    });

    expect(latestStore.settle).not.toHaveBeenCalled();
  });

  it("does not call syncFromParams while navigation is pending", () => {
    vi.mocked(mergeCollectionParams).mockReturnValue(new URLSearchParams("filter.p.tag=sale"));

    const actions = mountWithConsumer(
      () => {
        const a = useCollectionActions();
        return { exposed: a, render: () => null };
      },
      { urlSearch: "" },
    );

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);
    vi.mocked(latestStore.syncFromParams).mockClear();

    actions.toggleFilter({ tag: "sale" });

    expect(latestStore.syncFromParams).not.toHaveBeenCalled();
  });

  it("ignores intermediate URLs during rapid filter toggling", async () => {
    vi.mocked(mergeCollectionParams)
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=A&filter.p.tag=B"))
      .mockReturnValueOnce(new URLSearchParams("filter.p.tag=B"));

    const Consumer = defineComponent({
      setup() {
        const actions = useCollectionActions();
        return () => h("button", { onClick: () => actions.toggleFilter({ tag: "test" }) });
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData, urlSearch: "" },
      slots: { default: () => h(Consumer) },
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    const button = wrapper.find("button");
    await button.trigger("click");
    await button.trigger("click");
    await button.trigger("click");

    vi.mocked(latestStore.syncFromParams).mockClear();

    await wrapper.setProps({ urlSearch: "filter.p.tag=A&filter.p.tag=B" });

    expect(latestStore.syncFromParams).not.toHaveBeenCalled();
  });

  it("handles external navigation during a pending browse-change chain", async () => {
    vi.mocked(mergeCollectionParams).mockReturnValueOnce(new URLSearchParams("filter.p.tag=A"));

    const Consumer = defineComponent({
      setup() {
        const actions = useCollectionActions();
        return () => h("button", { onClick: () => actions.toggleFilter({ tag: "A" }) });
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData, urlSearch: "" },
      slots: { default: () => h(Consumer) },
    });

    vi.mocked(latestStore.matchesParams).mockReturnValue(false);

    await wrapper.find("button").trigger("click");

    vi.mocked(latestStore.syncFromParams).mockClear();

    await wrapper.setProps({ urlSearch: "sort_by=price-ascending" });

    expect(latestStore.syncFromParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  it("keeps injected composables on the new store after handle changes", async () => {
    vi.mocked(createCollectionStore).mockImplementation(({ data }) => createMockStore(data.handle));

    const Consumer = defineComponent({
      setup() {
        const handle = useCollection((state) => state.handle);
        return () => h("span", { "data-testid": "handle" }, handle.value);
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="handle"]').text()).toBe("shoes");

    await wrapper.setProps({ data: hatsData });
    await nextTick();

    expect(wrapper.find('[data-testid="handle"]').text()).toBe("hats");
  });
});

// ---------------------------------------------------------------------------
// useCollection
// ---------------------------------------------------------------------------

describe("useCollection", () => {
  it("returns the full collection state when called without a selector", () => {
    const state = mountWithConsumer(() => {
      const s = useCollection();
      return { exposed: s, render: () => null };
    });

    expect(state.value).toEqual(
      expect.objectContaining({ handle: "shoes", status: "idle", filters: [] }),
    );
  });

  it("returns a selected slice when given a selector", () => {
    const status = mountWithConsumer(() => {
      const s = useCollection((state) => state.status);
      return { exposed: s, render: () => null };
    });

    expect(status.value).toBe("idle");
  });

  it("re-renders when state changes", async () => {
    const renderSpy = vi.fn();
    const Consumer = defineComponent({
      setup() {
        const status = useCollection((s) => s.status);
        return () => {
          renderSpy();
          return h("span", { "data-testid": "status" }, status.value);
        };
      },
    });

    const wrapper = mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="status"]').text()).toBe("idle");

    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));
    await nextTick();

    expect(wrapper.find('[data-testid="status"]').text()).toBe("loading");
  });

  it("skips re-render when isEqual returns true", async () => {
    const alwaysEqual = vi.fn(() => true);
    const renderSpy = vi.fn();

    const Consumer = defineComponent({
      setup() {
        const status = useCollection((s) => ({ status: s.status }), alwaysEqual);
        return () => {
          renderSpy();
          return h("span", null, status.value.status);
        };
      },
    });

    mount(CollectionProvider, {
      props: { data: shoesData },
      slots: { default: () => h(Consumer) },
    });

    const initialRenderCount = renderSpy.mock.calls.length;

    latestStore.setState(makeCollectionState("shoes", { status: "loading" }));
    await nextTick();

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
    expect(alwaysEqual).toHaveBeenCalled();
  });

  it("throws when used outside a CollectionProvider", () => {
    const Consumer = defineComponent({
      setup() {
        useCollection();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("must be used inside a <CollectionProvider>");
  });
});

// ---------------------------------------------------------------------------
// useCollectionActions
// ---------------------------------------------------------------------------

describe("useCollectionActions", () => {
  it("setFilters calls store.setFilters", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.setFilters([{ tag: "men" }]);

    expect(latestStore.setFilters).toHaveBeenCalledWith([{ tag: "men" }]);
  });

  it("setSortKey calls store.setSortKey", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.setSortKey("PRICE", true);

    expect(latestStore.setSortKey).toHaveBeenCalledWith("PRICE", true);
  });

  it("toggleFilter calls store.toggleFilter", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.toggleFilter({ tag: "sale" });

    expect(latestStore.toggleFilter).toHaveBeenCalledWith({ tag: "sale" });
  });

  it("toggleFilterInput delegates to store.toggleFilterInput", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.toggleFilterInput('{"tag":"sale"}');

    expect(latestStore.toggleFilterInput).toHaveBeenCalledWith('{"tag":"sale"}');
  });

  it("setSortByValue delegates to store.setSortByValue", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.setSortByValue("price-descending");

    expect(latestStore.setSortByValue).toHaveBeenCalledWith("price-descending");
  });

  it("reset calls store.reset", () => {
    const actions = mountWithConsumer(() => {
      const a = useCollectionActions();
      return { exposed: a, render: () => null };
    });

    actions.reset();

    expect(latestStore.reset).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCollectionForm
// ---------------------------------------------------------------------------

describe("useCollectionForm", () => {
  it("returns a formProps function", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = useCollectionForm();
      return { exposed: f, render: () => null };
    });

    expect(typeof formProps).toBe("function");
  });

  it("calls handleFormSubmit with the native event on submit", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = useCollectionForm();
      return { exposed: f, render: () => null };
    });

    const props = formProps();
    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(nativeEvent, "target", { value: form });
    Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(nativeEvent.preventDefault).toHaveBeenCalled();
    expect(latestStore.handleFormSubmit).toHaveBeenCalledWith(nativeEvent);
  });

  it("calls beforeSubmit and afterSubmit callbacks", () => {
    const order: string[] = [];
    const beforeSubmit = vi.fn(() => order.push("before"));
    const afterSubmit = vi.fn(() => order.push("after"));

    const { formProps } = mountWithConsumer(() => {
      const f = useCollectionForm();
      return { exposed: f, render: () => null };
    });

    const props = formProps({ beforeSubmit, afterSubmit });
    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(nativeEvent, "target", { value: form });
    Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(order).toEqual(["before", "after"]);
  });

  it("does not call handleFormSubmit when defaultPrevented", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = useCollectionForm();
      return { exposed: f, render: () => null };
    });

    const props = formProps({
      beforeSubmit: (e: Event) => e.preventDefault(),
    });

    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null, cancelable: true });
    Object.defineProperty(nativeEvent, "target", { value: form });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(latestStore.handleFormSubmit).not.toHaveBeenCalled();
  });

  it("throws when used outside a CollectionProvider", () => {
    const Consumer = defineComponent({
      setup() {
        useCollectionForm();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("must be used inside a <CollectionProvider>");
  });
});
