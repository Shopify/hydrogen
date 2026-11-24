// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import { renderToString } from "vue/server-renderer";

import type { CollectionActions } from "../core/collection";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollection, useCollectionActions } from "./collection";
import { CollectionView, type CollectionViewProps } from "./collection-view";

vi.mock("../core/shopify-scripts/standard-events", async () => {
  const { fakeStandardEvents } = await import("../core/collection/__tests__/fake-standard-events");
  return {
    importStandardEventsFromCDN: () =>
      Promise.resolve({
        ...fakeStandardEvents,
        createViewEventElement: () => FakeViewEventElement,
      }),
  };
});

// Mirrors the CDN element: `connect` sends the event after connecting, and each send re-reads the payload.
class FakeViewEventElement extends HTMLElement {
  connectedCallback() {
    if (this.getAttribute("view-event-trigger") === "connect") {
      setTimeout(() => this.dispatchViewEvent());
    }
  }

  dispatchViewEvent() {
    if (!this.isConnected) return;
    const detail = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
    this.dispatchEvent(new CustomEvent("shopify:collection:view", { bubbles: true, detail }));
  }
}

const collection = { id: "gid://shopify/Collection/1", handle: "shirts", title: "Shirts" };
const otherCollection = { id: "gid://shopify/Collection/2", handle: "pants", title: "Pants" };

function payloadOf(element: Element) {
  return JSON.parse(element.getAttribute("view-event-payload") ?? "null");
}

/** Renders `CollectionView` inside a provider for the same collection. */
const View = defineComponent({
  inheritAttrs: false,
  props: {
    collection: { type: Object as PropType<CollectionViewProps["collection"]>, required: true },
    productsCount: { type: Number, required: true },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(CollectionProvider, { data: { handle: props.collection.handle, dataSearch: "" } }, () =>
        h(CollectionView, { ...attrs, ...props }, slots),
      );
  },
});

describe("CollectionView", () => {
  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the element with the view attributes, slot content, and attributes", () => {
    const wrapper = mount(View, {
      props: { collection, productsCount: 8 },
      attrs: { class: "grid", id: "results" },
      slots: { default: () => h("span", "Products") },
      attachTo: document.body,
    });

    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(element.getAttribute("class")).toBe("grid");
    expect(element.id).toBe("results");
    expect(element.getAttribute("view-event-trigger")).toBe("connect");
    expect(payloadOf(element)).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 8 },
    });
    expect(element.textContent).toBe("Products");
  });

  it("renders the element and payload on the server", async () => {
    const html = await renderToString(h(View, { collection, productsCount: 8, class: "grid" }));

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="grid"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain("gid://shopify/Collection/1");
  });

  it("remounts the element for a new handle, but not for a new productsCount", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:collection:view", listener);

    const wrapper = mount(View, {
      props: { collection, productsCount: 8 },
      attrs: { class: "grid" },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;

    await wrapper.setProps({ collection: { ...collection }, productsCount: 16 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.find(VIEW_EVENT_TAG_NAME).element).toBe(element);
    expect(events).toHaveLength(1);
    expect(payloadOf(element).collection.productsCount).toBe(16);

    await wrapper.setProps({ collection: otherCollection, productsCount: 4 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.removeEventListener("shopify:collection:view", listener);

    const next = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(next).not.toBe(element);
    expect(next.getAttribute("class")).toBe("grid");
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(next);
    expect(events[1]?.detail).toEqual({
      collection: { id: otherCollection.id, handle: "pants", productsCount: 4 },
    });
  });
});

type UpdateEvent = Event & {
  collection: { productsCount: number };
  promise: Promise<{ productsCount: number }>;
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

type Loader = { handle: string; dataSearch: string; productsCount: number };

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
              collection: { id: null, handle: props.loader.handle },
              productsCount: props.loader.productsCount,
            },
            () => h(Controls),
          ),
      );
  },
});

describe("Vue CollectionView updates", () => {
  const events: UpdateEvent[] = [];
  const record = (event: Event) => events.push(event as UpdateEvent);

  function eventAt(index: number): UpdateEvent {
    const event = events[index];
    assert(event, `expected update event ${index}`);
    return event;
  }

  async function mountPage(urlSearch = "") {
    document.addEventListener("shopify:collection:update", record);
    const wrapper = mount(Page, {
      props: { loader: { handle: "shirts", dataSearch: urlSearch, productsCount: 8 }, urlSearch },
      attachTo: document.body,
    });
    await flushPromises();
    return wrapper;
  }

  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:update", record);
    events.length = 0;
    actions = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("throws outside a collection provider", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      mount(CollectionView, {
        props: { collection: { id: null, handle: "all" }, productsCount: 1 },
      }),
    ).toThrow("CollectionView must be used inside a <CollectionProvider>.");
  });

  it("sends an update from the element for a sort change and resolves with the new count", async () => {
    const wrapper = await mountPage();

    getActions().setSortKey("PRICE");

    expect(events.map((event) => event.collection.productsCount)).toEqual([8]);
    expect(eventAt(0).target).toBe(wrapper.find(VIEW_EVENT_TAG_NAME).element);

    // The router moves to the new URL first, then the loader data arrives.
    await wrapper.setProps({ urlSearch: "sort_by=price-ascending" });
    await wrapper.setProps({
      loader: { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 3 },
    });

    await expect(eventAt(0).promise).resolves.toEqual({ productsCount: 3 });
    wrapper.unmount();
  });

  it("resolves with the new count when the URL, the data, and the count arrive in one render", async () => {
    const wrapper = await mountPage();

    getActions().setSortKey("PRICE");
    // The provider settles the store while it gets the new props, before CollectionView gets the
    // new count.
    await wrapper.setProps({
      urlSearch: "sort_by=price-ascending",
      loader: { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 3 },
    });

    await expect(eventAt(0).promise).resolves.toEqual({ productsCount: 3 });
    wrapper.unmount();
  });

  it("rejects a pending update with an AbortError when a new collection replaces the store", async () => {
    const wrapper = await mountPage();

    getActions().setSortKey("PRICE");
    await wrapper.setProps({
      urlSearch: "",
      loader: { handle: "pants", dataSearch: "", productsCount: 4 },
    });

    await expect(eventAt(0).promise).rejects.toMatchObject({ name: "AbortError" });
    getActions().setSortKey("TITLE");
    expect(events).toHaveLength(2);
    wrapper.unmount();
  });

  it("doesn't settle in the same step when the change handler moves the URL right away", async () => {
    document.addEventListener("shopify:collection:update", record);
    // Like the Nuxt example: the change handler sets the URL search right away, and the loader data
    // arrives later.
    const urlSearch = ref("");
    const loader = ref<Loader>({ handle: "shirts", dataSearch: "", productsCount: 8 });
    const statuses: string[] = [];
    const Status = defineComponent(() => {
      const state = useCollection();
      return () => {
        statuses.push(state.value.status);
        return null;
      };
    });
    const RoutedPage = defineComponent(
      () => () =>
        h(
          CollectionProvider,
          {
            data: { handle: loader.value.handle, dataSearch: loader.value.dataSearch },
            urlSearch: urlSearch.value,
            onChange: (search: string) => (urlSearch.value = search.replace(/^\?/, "")),
          },
          () =>
            h(
              CollectionView,
              {
                collection: { id: null, handle: "shirts" },
                productsCount: loader.value.productsCount,
              },
              () => [h(Controls), h(Status)],
            ),
        ),
    );
    const wrapper = mount(RoutedPage, { attachTo: document.body });
    await flushPromises();
    statuses.length = 0;

    getActions().setSortKey("PRICE");
    await nextTick();

    // The provider gets the new URL and a new `data` object with the old values in the same render.
    // It must not settle the store with the old data in between.
    expect(statuses).toEqual(["loading"]);

    loader.value = { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 3 };

    await expect(eventAt(0).promise).resolves.toEqual({ productsCount: 3 });
    wrapper.unmount();
  });
});
