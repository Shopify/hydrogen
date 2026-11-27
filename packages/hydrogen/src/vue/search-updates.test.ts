// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type PropType } from "vue";

import type { CollectionActions } from "../core/collection";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { SearchUpdates } from "./search-updates";

vi.mock("../core/shopify-scripts/standard-events", async () => {
  const { fakeStandardEvents } = await import("../core/collection/__tests__/fake-standard-events");
  return { importStandardEventsFromCDN: () => Promise.resolve(fakeStandardEvents) };
});

type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<{ totalCount: number }>;
};

let actions: CollectionActions | undefined;
const Controls = defineComponent(() => {
  actions = useCollectionActions();
  return () => null;
});

function getActions() {
  assert(actions, "expected the collection actions");
  return actions;
}

type Loader = { term: string; dataSearch: string; totalCount: number };

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

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);

function eventAt(index: number): UpdateEvent {
  const event = events[index];
  assert(event, `expected search update event ${index}`);
  return event;
}

async function mountPage() {
  document.addEventListener("shopify:search:update", record);
  const wrapper = mount(Page, {
    props: {
      loader: { term: "shirt", dataSearch: "q=shirt", totalCount: 12 },
      urlSearch: "q=shirt",
    },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

describe("Vue SearchUpdates", () => {
  afterEach(() => {
    document.removeEventListener("shopify:search:update", record);
    events.length = 0;
    actions = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("throws outside a collection provider", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => mount(SearchUpdates, { props: { query: "shirt", totalCount: 1 } })).toThrow(
      "SearchUpdates must be used inside a <CollectionProvider>.",
    );
  });

  it("sends an update from its div for a sort change and resolves with the new total count", async () => {
    const wrapper = await mountPage();

    getActions().setSortKey("PRICE");

    expect(events.map((event) => event.search)).toEqual([{ query: "shirt", sortKey: "PRICE" }]);
    expect(eventAt(0).target).toBe(wrapper.find("div.results").element);

    // The router moves to the new URL first, then the loader data arrives.
    const search = "q=shirt&sort_by=price-ascending";
    await wrapper.setProps({ urlSearch: search });
    await wrapper.setProps({ loader: { term: "shirt", dataSearch: search, totalCount: 7 } });

    await expect(eventAt(0).promise).resolves.toEqual({ totalCount: 7 });
    wrapper.unmount();
  });

  it("resolves with the new total count when the URL, the data, and the count arrive in one render", async () => {
    const wrapper = await mountPage();

    getActions().toggleFilter({ productVendor: "Acme" });
    // The provider settles the store while it gets the new props, before SearchUpdates gets the
    // new count.
    const search = "q=shirt&filter.p.vendor=Acme";
    await wrapper.setProps({
      urlSearch: search,
      loader: { term: "shirt", dataSearch: search, totalCount: 0 },
    });

    await expect(eventAt(0).promise).resolves.toEqual({ totalCount: 0 });
    wrapper.unmount();
  });
});
