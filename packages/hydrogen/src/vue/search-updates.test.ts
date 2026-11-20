// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, type PropType } from "vue";
import { renderToString } from "vue/server-renderer";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { CollectionActions } from "../core/collection";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { SearchUpdates } from "./search-updates";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../core/shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { totalCount: number };
type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<UpdateResult>;
};

class FakeSearchUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:search:update", { bubbles: true });
    Object.assign(this, payload);
  }
}

type Loader = { term: string; dataSearch: string; totalCount: number };

let actions: CollectionActions | undefined;
const Controls = defineComponent(() => {
  actions = useCollectionActions();
  return () => null;
});

function getActions(): CollectionActions {
  assert(actions, "expected the collection actions");
  return actions;
}

const Page = defineComponent({
  props: {
    loader: { type: Object as PropType<Loader>, required: true },
    urlSearch: { type: String, required: true },
  },
  setup(props) {
    return () =>
      h(
        CollectionProvider,
        {
          data: { handle: `search:${props.loader.term}`, dataSearch: props.loader.dataSearch },
          urlSearch: props.urlSearch,
        },
        () =>
          h(
            SearchUpdates,
            { query: props.loader.term, totalCount: props.loader.totalCount, class: "results" },
            () => h(Controls),
          ),
      );
  },
});

function mountPage(loader: Loader, urlSearch: string) {
  return mount(Page, { props: { loader, urlSearch }, attachTo: document.body });
}

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);

async function rejection(promise: Promise<unknown> | undefined) {
  return promise?.catch((reason: unknown) => reason);
}

describe("Vue SearchUpdates", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      SearchUpdateEvent: FakeSearchUpdateEvent,
    } as unknown as typeof StandardEventsModule);
    document.addEventListener("shopify:search:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:search:update", record);
    events.length = 0;
    actions = undefined;
    document.body.innerHTML = "";
  });

  it("sends one event per filter change and resolves with the total count of the new results", async () => {
    const wrapper = mountPage({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt");
    await flushPromises();

    getActions().toggleFilter({ productVendor: "Acme" });

    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe(wrapper.find("div.results").element);
    expect(events[0]?.search).toEqual({
      query: "shirt",
      productFilters: [{ productVendor: "Acme" }],
    });

    // The router moves to the new URL first, then the loader data arrives.
    const search = "q=shirt&filter.p.vendor=Acme";
    await wrapper.setProps({
      loader: { term: "shirt", dataSearch: "q=shirt", totalCount: 12 },
      urlSearch: search,
    });
    await wrapper.setProps({
      loader: { term: "shirt", dataSearch: search, totalCount: 0 },
      urlSearch: search,
    });

    await expect(events[0]?.promise).resolves.toEqual({ totalCount: 0 });
    expect(events).toHaveLength(1);
    wrapper.unmount();
  });

  it("rejects pending promises on a new search and sends the new query after", async () => {
    const wrapper = mountPage({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt");
    await flushPromises();

    getActions().setSortKey("PRICE");
    await wrapper.setProps({
      loader: { term: "pants", dataSearch: "q=pants", totalCount: 4 },
      urlSearch: "q=pants",
    });

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });

    await flushPromises();
    getActions().setSortKey("PRICE");
    expect(events[1]?.search).toEqual({ query: "pants", sortKey: "PRICE" });
    wrapper.unmount();
  });

  it("rejects pending promises with an AbortError on unmount", async () => {
    const wrapper = mountPage({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt");
    await flushPromises();

    getActions().setSortKey("PRICE");
    wrapper.unmount();

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });
  });

  it("throws outside a provider", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => mount(SearchUpdates, { props: { query: "shirt", totalCount: 1 } })).toThrow(
      "SearchUpdates must be used inside a <CollectionProvider>.",
    );
    vi.mocked(console.warn).mockRestore();
  });

  it("renders the element and does nothing else on the server", async () => {
    const app = createSSRApp(Page, {
      loader: { term: "shirt", dataSearch: "q=shirt", totalCount: 12 },
      urlSearch: "q=shirt",
    });

    expect(await renderToString(app)).toContain('<div class="results">');
    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });
});
