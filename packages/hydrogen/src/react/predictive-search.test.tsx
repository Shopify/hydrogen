// @vitest-environment happy-dom
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  createElement,
  startTransition,
  StrictMode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PredictiveSearchModule from "../core/predictive-search";
import {
  createPredictiveSearchStore,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "../core/predictive-search";
import { getEmptyPredictiveSearchResult } from "../core/predictive-search/search";
import { assert } from "../core/test-utils";
import {
  PredictiveSearchProvider,
  usePredictiveSearch,
  usePredictiveSearchActions,
  usePredictiveSearchForm,
  type PredictiveSearchActions,
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

const IMMEDIATE_DEBOUNCE_IN_MS = 0;

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

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

function createMockStore(): MockPredictiveSearchStore {
  let state = makeState();
  const store = {
    connect: vi.fn(),
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

async function setupActualStore() {
  const actual = await vi.importActual<typeof PredictiveSearchModule>("../core/predictive-search");
  vi.mocked(createPredictiveSearchStore).mockImplementation(actual.createPredictiveSearchStore);
  return { fetch: vi.fn(async () => jsonResponse(getEmptyPredictiveSearchResult("snow"))) };
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

  it("connects the store on mount and destroys it when the provider unmounts", () => {
    const { unmount } = render(createElement(PredictiveSearchProvider, null, null));
    const store = latestStore;

    expect(store.connect).toHaveBeenCalledWith();

    unmount();

    expect(store.destroy).toHaveBeenCalledWith();

    const [connectOrder] = vi.mocked(store.connect).mock.invocationCallOrder;
    const [destroyOrder] = vi.mocked(store.destroy).mock.invocationCallOrder;
    assert(connectOrder, "Expected provider to connect the predictive search store");
    assert(destroyOrder, "Expected provider to destroy the predictive search store");
    expect(connectOrder).toBeLessThan(destroyOrder);
  });

  it("keeps searches working after StrictMode effect replay", async () => {
    const { fetch } = await setupActualStore();

    function SearchButton() {
      const { search } = usePredictiveSearchActions();
      return createElement("button", { onClick: () => void search("snow") }, "Search");
    }

    render(
      createElement(
        StrictMode,
        null,
        createElement(
          PredictiveSearchProvider,
          { fetch, debounceInMs: IMMEDIATE_DEBOUNCE_IN_MS },
          createElement(SearchButton),
        ),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/predictive-search?q=snow",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
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

  it("keeps actions stable and working after the provider recreates its store", async () => {
    const { fetch } = await setupActualStore();

    let predictiveSearchEndpoint = "/first";
    const { result, rerender } = renderHook(
      () => ({ actions: usePredictiveSearchActions(), state: usePredictiveSearch() }),
      {
        wrapper: ({ children }) =>
          createElement(
            PredictiveSearchProvider,
            { fetch, debounceInMs: IMMEDIATE_DEBOUNCE_IN_MS, predictiveSearchEndpoint },
            children,
          ),
      },
    );
    const initialActions = result.current.actions;

    predictiveSearchEndpoint = "/second";
    rerender();
    await act(async () => {
      await initialActions.search("snow");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/second?q=snow",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.state.status).toBe("success");

    act(() => initialActions.clear());

    expect(result.current.state).toMatchObject({ status: "idle", term: "" });
    expect(result.current.actions).toBe(initialActions);
  });

  it.each([
    ["useEffect", useEffect],
    ["useLayoutEffect", useLayoutEffect],
  ])(
    "lets a child %s search the new store in the commit that recreates it",
    async (_hookName, useChildEffect) => {
      const { fetch } = await setupActualStore();

      function SearchOnEndpointChange({ endpoint }: { endpoint: string }) {
        const { search } = usePredictiveSearchActions();
        useChildEffect(() => {
          void search("snow");
        }, [endpoint, search]);
        return null;
      }

      function App({ endpoint }: { endpoint: string }) {
        return createElement(
          PredictiveSearchProvider,
          { fetch, debounceInMs: IMMEDIATE_DEBOUNCE_IN_MS, predictiveSearchEndpoint: endpoint },
          createElement(SearchOnEndpointChange, { endpoint }),
        );
      }

      const { rerender } = render(createElement(App, { endpoint: "/first" }));
      await act(async () => {
        rerender(createElement(App, { endpoint: "/second" }));
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenLastCalledWith(
        "/second?q=snow",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    },
  );

  it("keeps actions on the committed store while a store-recreating transition is suspended", async () => {
    const { fetch } = await setupActualStore();
    const neverResolves = new Promise<never>(() => {});
    let shouldSuspend = false;
    let setEndpoint: ((endpoint: string) => void) | undefined;
    let committedActions: PredictiveSearchActions | undefined;

    function SearchStatus() {
      const actions = usePredictiveSearchActions();
      const status = usePredictiveSearch((state) => state.status);
      useLayoutEffect(() => {
        committedActions = actions;
      });
      return createElement("output", null, status);
    }

    function RouteContent() {
      if (shouldSuspend) throw neverResolves;
      return null;
    }

    function App() {
      const [predictiveSearchEndpoint, setPredictiveSearchEndpoint] = useState("/first");
      setEndpoint = setPredictiveSearchEndpoint;
      return createElement(
        Suspense,
        { fallback: null },
        createElement(
          PredictiveSearchProvider,
          { fetch, debounceInMs: IMMEDIATE_DEBOUNCE_IN_MS, predictiveSearchEndpoint },
          createElement(SearchStatus),
          createElement(RouteContent),
        ),
      );
    }

    render(createElement(App));
    assert(setEndpoint, "Expected App to expose its endpoint setter");
    const changeEndpoint = setEndpoint;
    shouldSuspend = true;
    await act(async () => {
      startTransition(() => changeEndpoint("/second"));
    });

    assert(committedActions, "Expected the search status to commit its actions");
    const { search } = committedActions;
    await act(async () => {
      await search("snow");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/first?q=snow",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("status").textContent).toBe("success");
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
