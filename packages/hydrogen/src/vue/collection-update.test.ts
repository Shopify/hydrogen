// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type PropType } from "vue";
import { renderToString } from "vue/server-renderer";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { CollectionActions } from "../core/collection";
import { COLLECTION_VIEW_TAG_NAME } from "../core/collection/collection-view";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { CollectionView } from "./collection-view";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../core/shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { productsCount: number };
type UpdateEvent = Event & {
  collection: { id: string | null; handle: string; productsCount: number };
  sortKey?: string;
  promise: Promise<UpdateResult>;
};

class FakeCollectionUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:collection:update", { bubbles: true });
    Object.assign(this, payload);
  }
}

type Loader = { handle: string; dataSearch: string; productsCount: number };

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
          data: { handle: props.loader.handle, dataSearch: props.loader.dataSearch },
          urlSearch: props.urlSearch,
        },
        () =>
          h(
            CollectionView,
            {
              collection: {
                id: `gid://shopify/Collection/${props.loader.handle}`,
                handle: props.loader.handle,
              },
              productsCount: props.loader.productsCount,
            },
            () => h(Controls),
          ),
      );
  },
});

function mountPage(loader: Loader, urlSearch = "") {
  return mount(Page, { props: { loader, urlSearch }, attachTo: document.body });
}

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);

async function rejection(promise: Promise<unknown> | undefined) {
  return promise?.catch((reason: unknown) => reason);
}

describe("Vue CollectionView collection update events", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      CollectionUpdateEvent: FakeCollectionUpdateEvent,
    } as unknown as typeof StandardEventsModule);
    document.addEventListener("shopify:collection:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:update", record);
    events.length = 0;
    actions = undefined;
    document.body.innerHTML = "";
  });

  it("sends one event per sort change and resolves with the count of the new results", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    getActions().setSortKey("PRICE", true);

    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe(wrapper.find(COLLECTION_VIEW_TAG_NAME).element);
    expect(events[0]?.collection).toEqual({
      id: "gid://shopify/Collection/shirts",
      handle: "shirts",
      productsCount: 8,
    });
    expect(events[0]?.sortKey).toBe("PRICE");

    await wrapper.setProps({ urlSearch: "sort_by=price-descending" });
    await wrapper.setProps({
      loader: { handle: "shirts", dataSearch: "sort_by=price-descending", productsCount: 3 },
    });

    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 3 });
    wrapper.unmount();
  });

  it("resolves when the new results have the same count", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    getActions().setSortKey("TITLE");
    await wrapper.setProps({
      urlSearch: "sort_by=title-ascending",
      loader: { handle: "shirts", dataSearch: "sort_by=title-ascending", productsCount: 8 },
    });

    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 8 });
    wrapper.unmount();
  });

  it("resolves every event of fast changes with the final count", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    getActions().setSortKey("TITLE");
    getActions().setSortKey("PRICE");
    await wrapper.setProps({
      urlSearch: "sort_by=price-ascending",
      loader: { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 6 },
    });

    expect(events).toHaveLength(2);
    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 6 },
      { productsCount: 6 },
    ]);
    wrapper.unmount();
  });

  it("sends no event for back and forward navigation or for pagination", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    await wrapper.setProps({ urlSearch: "sort_by=price-ascending" });
    await wrapper.setProps({
      loader: { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 8 },
    });
    await wrapper.setProps({
      loader: { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 16 },
    });
    getActions().setSortKey("PRICE");

    expect(events).toHaveLength(0);
    wrapper.unmount();
  });

  it("rejects pending promises with an AbortError on unmount", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    getActions().setSortKey("PRICE");
    wrapper.unmount();

    const error = await rejection(events[0]?.promise);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: "AbortError" });
  });

  it("rejects pending promises when the collection changes and follows the new collection", async () => {
    const wrapper = mountPage({ handle: "shirts", dataSearch: "", productsCount: 8 });
    await flushPromises();

    getActions().setSortKey("PRICE");
    await wrapper.setProps({ loader: { handle: "pants", dataSearch: "", productsCount: 4 } });

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });

    await flushPromises();
    getActions().setSortKey("TITLE");
    expect(events[1]?.collection).toEqual({
      id: "gid://shopify/Collection/pants",
      handle: "pants",
      productsCount: 4,
    });
    wrapper.unmount();
  });

  it("sends only the view event outside a provider", async () => {
    const wrapper = mount(CollectionView, {
      props: { collection: { id: null, handle: "shirts" }, productsCount: 1 },
      attachTo: document.body,
    });
    await flushPromises();

    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("does nothing on the server", async () => {
    const html = await renderToString(
      h(Page, { loader: { handle: "shirts", dataSearch: "", productsCount: 8 }, urlSearch: "" }),
    );

    expect(html).toContain(COLLECTION_VIEW_TAG_NAME);
    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });
});
