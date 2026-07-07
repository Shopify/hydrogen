// @vitest-environment happy-dom
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PredictiveSearchModule from "../core/predictive-search";
import {
  createPredictiveSearchStore,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "../core/predictive-search";
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

type MockPredictiveSearchStore = PredictiveSearchStore & {
  setState(state: PredictiveSearchState): void;
};

let latestStore: MockPredictiveSearchStore;
let subscribeListener: (() => void) | null = null;

function makeState(overrides: Partial<PredictiveSearchState> = {}): PredictiveSearchState {
  return {
    term: "",
    status: "idle",
    result: getEmptyPredictiveSearchResult(""),
    error: null,
    ...overrides,
  };
}

function createMockStore(): MockPredictiveSearchStore {
  let state = makeState();
  const store = {
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: () => void) => {
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
      subscribeListener?.();
    },
  } as MockPredictiveSearchStore;

  latestStore = store;
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeListener = null;
  vi.mocked(createPredictiveSearchStore).mockImplementation(() => createMockStore());
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(PredictiveSearchProvider, null, children);
}

describe("PredictiveSearchProvider", () => {
  it("creates a predictive search store with options", () => {
    const fetch = vi.fn();

    render(
      createElement(
        PredictiveSearchProvider,
        {
          predictiveSearchEndpoint: "/custom-search",
          debounceInMs: 25,
          minTermLength: 2,
          limit: 4,
          types: ["PRODUCT", "QUERY"],
          fetch,
        },
        null,
      ),
    );

    expect(createPredictiveSearchStore).toHaveBeenCalledWith({
      predictiveSearchEndpoint: "/custom-search",
      debounceInMs: 25,
      minTermLength: 2,
      limit: 4,
      types: ["PRODUCT", "QUERY"],
      fetch,
    });
  });

  it("does not recreate the store on rerender with the same config key", () => {
    const { rerender } = render(
      createElement(PredictiveSearchProvider, { types: ["PRODUCT", "QUERY"] }, null),
    );

    rerender(createElement(PredictiveSearchProvider, { types: ["PRODUCT", "QUERY"] }, null));

    expect(createPredictiveSearchStore).toHaveBeenCalledTimes(1);
  });

  it("destroys the store when the provider unmounts", () => {
    const { unmount } = render(createElement(PredictiveSearchProvider, null, null));
    const store = latestStore;

    unmount();

    expect(store.destroy).toHaveBeenCalledWith();
  });

  it("destroys the old store when the predictive search endpoint changes", () => {
    const { rerender } = render(
      createElement(PredictiveSearchProvider, { predictiveSearchEndpoint: "/first" }, null),
    );
    const firstStore = latestStore;

    rerender(
      createElement(PredictiveSearchProvider, { predictiveSearchEndpoint: "/second" }, null),
    );

    expect(firstStore.destroy).toHaveBeenCalledWith();
    expect(latestStore).not.toBe(firstStore);
  });

  it("does not recreate the store when only the search action changes", () => {
    const { rerender } = render(
      createElement(PredictiveSearchProvider, { searchAction: "/search" }, null),
    );

    rerender(createElement(PredictiveSearchProvider, { searchAction: "/find" }, null));

    expect(createPredictiveSearchStore).toHaveBeenCalledTimes(1);
  });
});

describe("usePredictiveSearch", () => {
  it("returns state and updates subscribers", () => {
    const { result } = renderHook(() => usePredictiveSearch(), { wrapper });

    act(() => {
      latestStore.setState(
        makeState({
          term: "snow",
          status: "success",
          result: getEmptyPredictiveSearchResult("snow"),
        }),
      );
    });

    expect(result.current.term).toBe("snow");
    expect(result.current.status).toBe("success");
  });

  it("supports selected state", () => {
    const { result } = renderHook(() => usePredictiveSearch((state) => state.status), {
      wrapper,
    });

    act(() => {
      latestStore.setState(makeState({ status: "loading" }));
    });

    expect(result.current).toBe("loading");
  });

  it("throws outside a provider", () => {
    expect(() => renderHook(() => usePredictiveSearch())).toThrow(
      "usePredictiveSearch must be used inside a <PredictiveSearchProvider>.",
    );
  });
});

describe("usePredictiveSearchActions", () => {
  it("returns stable search and clear actions", () => {
    const { result, rerender } = renderHook(() => usePredictiveSearchActions(), { wrapper });
    const firstActions = result.current;

    rerender();

    expect(result.current).toBe(firstActions);
  });

  it("calls the underlying store actions", () => {
    const { result } = renderHook(() => usePredictiveSearchActions(), { wrapper });

    void result.current.search("snow");
    result.current.clear();

    expect(latestStore.search).toHaveBeenCalledWith("snow");
    expect(latestStore.clear).toHaveBeenCalledWith();
  });
});

describe("usePredictiveSearchForm", () => {
  it("returns query register props that search on change", () => {
    function SearchInput() {
      const { register } = usePredictiveSearchForm();
      return createElement("input", {
        ...register("query", {
          "aria-label": "Search",
          onChange: vi.fn(),
        }),
      });
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchInput)));

    const input = screen.getByLabelText("Search");
    fireEvent.change(input, { target: { value: "snow" } });

    expect(input.getAttribute("name")).toBe("q");
    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(latestStore.search).toHaveBeenCalledWith("snow");
  });

  it("lets input change handlers opt out by preventing default", () => {
    function SearchInput() {
      const { register } = usePredictiveSearchForm();
      return createElement("input", {
        ...register("query", {
          "aria-label": "Search",
          onChange: (event) => event.preventDefault(),
        }),
      });
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchInput)));

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "snow" } });

    expect(latestStore.search).not.toHaveBeenCalled();
  });

  it("returns form props that search the query input on submit", () => {
    const onSubmit = vi.fn();

    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps({ action: "/search", method: "get", preventDefault: true, onSubmit }),
        createElement("input", { ...register("query"), defaultValue: "bindings" }),
      );
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchForm)));

    const form = screen.getByRole("searchbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(latestStore.search).toHaveBeenCalledWith("bindings");
    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), "bindings");
  });

  it("returns default search form attributes", () => {
    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps(),
        createElement("input", { ...register("query"), "aria-label": "Search" }),
      );
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchForm)));

    const form = screen.getByRole("search").closest("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/search");
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("role")).toBe("search");
  });

  it("uses the provider search action for form submissions", () => {
    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps(),
        createElement("input", { ...register("query"), "aria-label": "Search" }),
      );
    }

    render(
      createElement(PredictiveSearchProvider, { searchAction: "/find" }, createElement(SearchForm)),
    );

    const form = screen.getByRole("search").closest("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/find");
  });

  it("lets form props override default search form attributes", () => {
    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps({ action: "/custom", method: "post", role: "none" }),
        createElement("input", { ...register("query"), "aria-label": "Search" }),
      );
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchForm)));

    const form = screen.getByLabelText("Search").closest("form") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/custom");
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("role")).toBe("none");
  });

  it("does not search on submit when normal navigation owns the form", () => {
    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps({ action: "/search", method: "get" }),
        createElement("input", { ...register("query"), defaultValue: "snow" }),
      );
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchForm)));

    const form = screen.getByRole("searchbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(latestStore.search).not.toHaveBeenCalled();
  });

  it("lets form submit handlers opt out by preventing default", () => {
    function SearchForm() {
      const { formProps, register } = usePredictiveSearchForm();
      return createElement(
        "form",
        formProps({ preventDefault: true, onSubmit: (event) => event.preventDefault() }),
        createElement("input", { ...register("query"), defaultValue: "snow" }),
      );
    }

    render(createElement(PredictiveSearchProvider, null, createElement(SearchForm)));

    const form = screen.getByRole("searchbox").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(latestStore.search).not.toHaveBeenCalled();
  });
});
