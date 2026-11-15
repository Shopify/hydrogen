// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, onMounted, type PropType, type VNode } from "vue";

import { configureCartEndpoint, resetStandardActionsForTests } from "../core/cart/cart";
import type { CartData } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import type { ShopifyMatchedLocale } from "../core/i18n/types";
import { configureLogging } from "../core/logging";
import { assert, createTestLogger } from "../core/test-utils";
import { CartProvider, useCartActions, useCartForm } from "./cart";
import { LocaleProvider } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;
const CART: CartData = { ...EMPTY_CART_DATA, id: "gid://shopify/Cart/123", totalQuantity: 1 };

let fetchMock: ReturnType<typeof vi.fn>;

function requestedUrls(): unknown[] {
  return fetchMock.mock.calls.map(([url]) => url);
}

/** A request that stays in flight until its caller aborts it, as `fetch` does. */
function pendingUntilAborted(_url: string, init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
}

const CartForm = defineComponent({
  setup() {
    const { formProps } = useCartForm();
    return () => h("form", formProps());
  },
});

const LocalizedCart = defineComponent({
  props: {
    locale: { type: Object as PropType<ShopifyMatchedLocale>, required: true },
    initialData: { type: Object as PropType<{ cart: CartData | null }>, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h(LocaleProvider, { locale: props.locale }, () =>
        h(CartProvider, { initialData: props.initialData }, slots.default),
      );
  },
});

function mountLocalizedCart(
  props: { locale: ShopifyMatchedLocale; initialData?: { cart: CartData | null } },
  children: () => VNode[] = () => [],
) {
  return mount(LocalizedCart, { props, slots: { default: children } });
}

beforeEach(() => {
  fetchMock = vi.fn(async () => Response.json({ cart: CART }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  configureLogging({});
  resetStandardActionsForTests();
  delete (window as { Shopify?: unknown }).Shopify;
});

describe("CartProvider inside LocaleProvider", () => {
  it("loads the cart from the endpoint under the locale path prefix", async () => {
    mountLocalizedCart({ locale: FR_CA });

    await vi.waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
  });

  it("sends a cart load that a child starts on mount under the locale path prefix", async () => {
    const RefreshOnMount = defineComponent({
      setup() {
        const { refresh } = useCartActions();
        onMounted(refresh);
        return () => null;
      },
    });

    mountLocalizedCart({ locale: FR_CA, initialData: { cart: null } }, () => [h(RefreshOnMount)]);

    await vi.waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
  });

  it("keeps an endpoint that the app configured, for requests and form actions", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    configureCartEndpoint("/storefront/cart");

    const wrapper = mountLocalizedCart({ locale: FR_CA }, () => [h(CartForm)]);

    expect(wrapper.get("form").attributes("action")).toBe("/fr-ca/storefront/cart");
    await vi.waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/storefront/cart"]));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("moves requests and form actions to a new locale without restarting the store", async () => {
    let refresh: (() => void) | undefined;
    const CaptureRefresh = defineComponent({
      setup() {
        refresh = useCartActions().refresh;
        return () => null;
      },
    });
    fetchMock.mockImplementationOnce(pendingUntilAborted);
    const wrapper = mountLocalizedCart({ locale: FR_CA, initialData: { cart: CART } }, () => [
      h(CartForm),
      h(CaptureRefresh),
    ]);
    assert(refresh, "Expected the refresh action to be captured");
    refresh();
    await vi.waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
    const [[, refreshInFlight]] = fetchMock.mock.calls;

    await wrapper.setProps({ locale: EN_CA });

    // Restarting the store would abort the refresh that was in flight.
    expect(refreshInFlight.signal.aborted).toBe(false);
    expect(wrapper.get("form").attributes("action")).toBe("/en-ca/api/cart");
    refresh();
    await vi.waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart", "/en-ca/api/cart"]));
  });
});

describe("CartProvider without LocaleProvider", () => {
  it("warns in development on a page served under a locale path prefix", () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    (window as { Shopify?: unknown }).Shopify = { routes: { root: "/fr-ca/" } };

    mount(CartProvider, { props: { initialData: { cart: null } } });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no LocaleProvider"), {
      scope: "i18n",
    });
  });
});
