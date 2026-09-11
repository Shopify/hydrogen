// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import type * as PredictiveSearchModule from "../core/predictive-search";
import type { PredictiveSearchState, PredictiveSearchStore } from "../core/predictive-search";
import { createPredictiveSearchStore } from "../core/predictive-search";
import { getEmptyPredictiveSearchResult } from "../core/predictive-search/search";
import {
  PredictiveSearchProvider,
  usePredictiveSearch,
  usePredictiveSearchActions,
  usePredictiveSearchForm,
} from "./predictive-search";

vi.mock("../core/predictive-search", async (importOriginal) => {
  const actual = await importOriginal<typeof PredictiveSearchModule>();
  return {
    ...actual,
    createPredictiveSearchStore: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePredictiveSearchState(
  overrides: Partial<PredictiveSearchState> = {},
): PredictiveSearchState {
  return {
    term: "",
    status: "idle",
    result: getEmptyPredictiveSearchResult(""),
    error: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock store
// ---------------------------------------------------------------------------

type MockPredictiveSearchStore = PredictiveSearchStore & {
  setState(state: PredictiveSearchState): void;
};

let latestStore: MockPredictiveSearchStore;
let subscribeListener: ((state: PredictiveSearchState) => void) | null = null;

function createMockStore(): MockPredictiveSearchStore {
  let state = makePredictiveSearchState();
  const store = {
    connect: vi.fn(),
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: (state: PredictiveSearchState) => void) => {
      subscribeListener = fn;
      return () => {
        subscribeListener = null;
      };
    }),
    search: vi.fn(() => Promise.resolve()),
    clear: vi.fn(),
    destroy: vi.fn(),
    setState(next: PredictiveSearchState) {
      state = next;
      subscribeListener?.(state);
    },
  } as unknown as MockPredictiveSearchStore;

  latestStore = store;
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeListener = null;
  vi.mocked(createPredictiveSearchStore).mockImplementation(() => createMockStore());
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
  mount(PredictiveSearchProvider, {
    props: { ...providerProps },
    slots: { default: () => h(Consumer) },
  });
  if (captured === undefined) throw new Error("mountWithConsumer: setup was never called");
  return captured;
}

// ---------------------------------------------------------------------------
// PredictiveSearchProvider
// ---------------------------------------------------------------------------

describe("PredictiveSearchProvider", () => {
  it("creates a store with default options", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    mount(PredictiveSearchProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(createPredictiveSearchStore).toHaveBeenCalledWith(expect.objectContaining({}));
  });

  it("passes config options to the store factory", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    mount(PredictiveSearchProvider, {
      props: { limit: 5, debounceInMs: 200 },
      slots: { default: () => h(Consumer) },
    });

    expect(createPredictiveSearchStore).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, debounceInMs: 200 }),
    );
  });

  it("connects the store on mount and destroys it when the provider unmounts", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.connect).toHaveBeenCalledWith();
    expect(latestStore.destroy).not.toHaveBeenCalled();

    wrapper.unmount();

    expect(latestStore.destroy).toHaveBeenCalledTimes(1);
    expect(latestStore.destroy).toHaveBeenCalledWith();
  });

  it("recreates the store when config props change", async () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      props: { limit: 5 },
      slots: { default: () => h(Consumer) },
    });

    const firstStore = latestStore;
    expect(firstStore.destroy).not.toHaveBeenCalled();

    await wrapper.setProps({ limit: 10 });

    expect(latestStore).not.toBe(firstStore);
    expect(firstStore.destroy).toHaveBeenCalledTimes(1);
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.connect).toHaveBeenCalledWith();
  });

  it("does NOT recreate the store when searchAction changes", async () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      props: { searchAction: "/search" },
      slots: { default: () => h(Consumer) },
    });

    const firstStore = latestStore;

    await wrapper.setProps({ searchAction: "/new-search" });

    expect(latestStore).toBe(firstStore);
    expect(firstStore.destroy).not.toHaveBeenCalled();
  });

  it("destroys the old store when recreating", async () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      props: { limit: 5 },
      slots: { default: () => h(Consumer) },
    });

    const firstStore = latestStore;

    await wrapper.setProps({ limit: 10 });

    expect(firstStore.destroy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// usePredictiveSearch
// ---------------------------------------------------------------------------

describe("usePredictiveSearch", () => {
  it("returns the full state when called without a selector", () => {
    const state = mountWithConsumer(() => {
      const s = usePredictiveSearch();
      return { exposed: s, render: () => null };
    });

    expect(state.value).toEqual(expect.objectContaining({ term: "", status: "idle", error: null }));
  });

  it("returns a selected slice when given a selector", () => {
    const status = mountWithConsumer(() => {
      const s = usePredictiveSearch((state) => state.status);
      return { exposed: s, render: () => null };
    });

    expect(status.value).toBe("idle");
  });

  it("re-renders when state changes", async () => {
    const renderSpy = vi.fn();
    const Consumer = defineComponent({
      setup() {
        const status = usePredictiveSearch((s) => s.status);
        return () => {
          renderSpy();
          return h("span", { "data-testid": "status" }, status.value);
        };
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="status"]').text()).toBe("idle");

    latestStore.setState(makePredictiveSearchState({ status: "loading" }));
    await nextTick();

    expect(wrapper.find('[data-testid="status"]').text()).toBe("loading");
  });

  it("skips re-render when isEqual returns true", async () => {
    const alwaysEqual = vi.fn(() => true);
    const renderSpy = vi.fn();

    const Consumer = defineComponent({
      setup() {
        const status = usePredictiveSearch((s) => ({ status: s.status }), alwaysEqual);
        return () => {
          renderSpy();
          return h("span", null, status.value.status);
        };
      },
    });

    mount(PredictiveSearchProvider, {
      slots: { default: () => h(Consumer) },
    });

    const initialRenderCount = renderSpy.mock.calls.length;

    latestStore.setState(makePredictiveSearchState({ status: "loading" }));
    await nextTick();

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
    expect(alwaysEqual).toHaveBeenCalled();
  });

  it("throws when used outside a PredictiveSearchProvider", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearch();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("must be used inside a <PredictiveSearchProvider>");
  });

  it("tracks the new store after provider recreation", async () => {
    vi.mocked(createPredictiveSearchStore).mockImplementation(() => createMockStore());

    const Consumer = defineComponent({
      setup() {
        const term = usePredictiveSearch((s) => s.term);
        return () => h("span", { "data-testid": "term" }, term.value);
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      props: { limit: 5 },
      slots: { default: () => h(Consumer) },
    });

    await wrapper.setProps({ limit: 10 });
    await nextTick();

    latestStore.setState(makePredictiveSearchState({ term: "snow" }));
    await nextTick();

    expect(wrapper.find('[data-testid="term"]').text()).toBe("snow");
  });
});

// ---------------------------------------------------------------------------
// usePredictiveSearchActions
// ---------------------------------------------------------------------------

describe("usePredictiveSearchActions", () => {
  it("search delegates to store.search", () => {
    const actions = mountWithConsumer(() => {
      const a = usePredictiveSearchActions();
      return { exposed: a, render: () => null };
    });

    void actions.search("snow");

    expect(latestStore.search).toHaveBeenCalledWith("snow");
  });

  it("clear delegates to store.clear", () => {
    const actions = mountWithConsumer(() => {
      const a = usePredictiveSearchActions();
      return { exposed: a, render: () => null };
    });

    actions.clear();

    expect(latestStore.clear).toHaveBeenCalled();
  });

  it("delegates to the latest store after recreation", async () => {
    const Consumer = defineComponent({
      setup() {
        const actions = usePredictiveSearchActions();
        return () =>
          h("button", {
            onClick: () => void actions.search("board"),
          });
      },
    });

    const wrapper = mount(PredictiveSearchProvider, {
      props: { limit: 5 },
      slots: { default: () => h(Consumer) },
    });

    const firstStore = latestStore;

    await wrapper.setProps({ limit: 10 });
    await nextTick();

    await wrapper.find("button").trigger("click");

    expect(firstStore.search).not.toHaveBeenCalled();
    expect(latestStore.search).toHaveBeenCalledWith("board");
  });

  it("throws when used outside a PredictiveSearchProvider", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearchActions();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("must be used inside a <PredictiveSearchProvider>");
  });
});

// ---------------------------------------------------------------------------
// usePredictiveSearchForm
// ---------------------------------------------------------------------------

describe("usePredictiveSearchForm", () => {
  it("register returns input attributes with onInput that triggers search", () => {
    const { register } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = register("query");

    expect(attrs).toEqual(
      expect.objectContaining({
        name: "q",
        type: "search",
        autoComplete: "off",
      }),
    );
    expect(typeof attrs.onInput).toBe("function");

    const input = document.createElement("input");
    input.value = "snow";
    const event = new Event("input", { bubbles: true });
    Object.defineProperty(event, "target", { value: input });

    (attrs.onInput as (e: Event) => void)(event);

    expect(latestStore.search).toHaveBeenCalledWith("snow");
  });

  it("register calls user onInput callback with term", () => {
    const userOnInput = vi.fn();
    const { register } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = register("query", { onInput: userOnInput });

    const input = document.createElement("input");
    input.value = "board";
    const event = new Event("input", { bubbles: true });
    Object.defineProperty(event, "target", { value: input });

    (attrs.onInput as (e: Event) => void)(event);

    expect(userOnInput).toHaveBeenCalledWith(event, "board");
    expect(latestStore.search).toHaveBeenCalledWith("board");
  });

  it("register respects preventDefault to opt out of search", () => {
    const { register } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = register("query", {
      onInput: (e: Event) => e.preventDefault(),
    });

    const input = document.createElement("input");
    input.value = "snow";
    const event = new Event("input", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: input });

    (attrs.onInput as (e: Event) => void)(event);

    expect(latestStore.search).not.toHaveBeenCalled();
  });

  it("register merges user attributes with core attributes", () => {
    const { register } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = register("query", {
      "aria-label": "Search products",
      placeholder: "Search",
    });

    expect(attrs).toEqual(
      expect.objectContaining({
        name: "q",
        type: "search",
        "aria-label": "Search products",
        placeholder: "Search",
      }),
    );
  });

  it("formProps returns default form attributes", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps();

    expect(attrs).toEqual(
      expect.objectContaining({
        action: "/search",
        method: "get",
        role: "search",
      }),
    );
  });

  it("formProps uses searchAction for the action attribute", () => {
    const { formProps } = mountWithConsumer(
      () => {
        const f = usePredictiveSearchForm();
        return { exposed: f, render: () => null };
      },
      { searchAction: "/custom-search" },
    );

    const attrs = formProps();

    expect(attrs).toEqual(
      expect.objectContaining({
        action: "/custom-search",
      }),
    );
  });

  it("formProps with preventDefault triggers search on submit", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps({ preventDefault: true });

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "q";
    input.value = "snow";
    form.appendChild(input);

    const event = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(event, "target", { value: form });
    Object.defineProperty(event, "currentTarget", { value: form });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    (attrs.onSubmit as (e: Event) => void)(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(latestStore.search).toHaveBeenCalledWith("snow");
  });

  it("formProps without preventDefault does not trigger search", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps();

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "q";
    input.value = "snow";
    form.appendChild(input);

    const event = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(event, "target", { value: form });
    Object.defineProperty(event, "currentTarget", { value: form });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    (attrs.onSubmit as (e: Event) => void)(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(latestStore.search).not.toHaveBeenCalled();
  });

  it("formProps calls user onSubmit callback with term", () => {
    const userOnSubmit = vi.fn();
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps({ onSubmit: userOnSubmit, preventDefault: true });

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "q";
    input.value = "board";
    form.appendChild(input);

    const event = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(event, "target", { value: form });
    Object.defineProperty(event, "currentTarget", { value: form });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    (attrs.onSubmit as (e: Event) => void)(event);

    expect(userOnSubmit).toHaveBeenCalledWith(event, "board");
  });

  it("formProps respects user preventDefault to skip search", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps({
      preventDefault: true,
      onSubmit: (e: Event) => e.preventDefault(),
    });

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "q";
    input.value = "snow";
    form.appendChild(input);

    const event = new SubmitEvent("submit", { submitter: null, cancelable: true });
    Object.defineProperty(event, "target", { value: form });
    Object.defineProperty(event, "currentTarget", { value: form });

    (attrs.onSubmit as (e: Event) => void)(event);

    expect(latestStore.search).not.toHaveBeenCalled();
  });

  it("formProps merges user attributes", () => {
    const { formProps } = mountWithConsumer(() => {
      const f = usePredictiveSearchForm();
      return { exposed: f, render: () => null };
    });

    const attrs = formProps({ className: "search-form" });

    expect(attrs).toEqual(
      expect.objectContaining({
        action: "/search",
        method: "get",
        role: "search",
        className: "search-form",
      }),
    );
  });

  it("throws when used outside a PredictiveSearchProvider", () => {
    const Consumer = defineComponent({
      setup() {
        usePredictiveSearchForm();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("must be used inside a <PredictiveSearchProvider>");
  });
});
