// @vitest-environment happy-dom
import { act, render, waitFor } from "@testing-library/react";
import { createElement, useEffect, useLayoutEffect, type ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureCartEndpoint, resetStandardActionsForTests } from "../core/cart/cart";
import type { CartData } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import { configureLogging } from "../core/logging";
import { assert, createTestLogger } from "../core/test-utils";
import { CartProvider, useCartActions, useCartForm } from "./cart";
import { LocaleProvider, type LocaleProviderProps } from "./locale";

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

function CartForm() {
  const { formProps } = useCartForm();
  return createElement("form", formProps());
}

function getFormAction(container: HTMLElement): string | null {
  const form = container.querySelector("form");
  assert(form, "Expected the cart form to render");
  return form.getAttribute("action");
}

function localizedCart(
  locale: LocaleProviderProps["locale"],
  cartProps: Parameters<typeof CartProvider>[0],
  ...children: ReactNode[]
) {
  return createElement(
    LocaleProvider,
    { locale },
    createElement(CartProvider, cartProps, ...children),
  );
}

beforeEach(() => {
  fetchMock = vi.fn(async () => Response.json({ cart: CART }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  configureLogging({});
  resetStandardActionsForTests();
  delete (window as { Shopify?: unknown }).Shopify;
  document.body.replaceChildren();
});

describe("CartProvider inside LocaleProvider", () => {
  it("loads the cart from the endpoint under the locale path prefix", async () => {
    render(localizedCart(FR_CA, {}));

    await waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
  });

  // Child effects of both kinds run before the provider's own, so each has to be covered.
  it.each([
    { phase: "an effect", useMountEffect: useEffect },
    { phase: "a layout effect", useMountEffect: useLayoutEffect },
  ])(
    "sends a cart load that a child starts in $phase on mount under the locale path prefix",
    async ({ useMountEffect }) => {
      function RefreshOnMount() {
        const { refresh } = useCartActions();
        useMountEffect(() => refresh(), [refresh]);
        return null;
      }

      render(localizedCart(FR_CA, { initialData: { cart: null } }, createElement(RefreshOnMount)));

      await waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
    },
  );

  it("hydrates server-rendered cart forms that post under the locale path prefix", async () => {
    const tree = localizedCart(FR_CA, { initialData: { cart: CART } }, createElement(CartForm));
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    expect(getFormAction(container)).toBe("/fr-ca/api/cart");

    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });

    expect(getFormAction(container)).toBe("/fr-ca/api/cart");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
  });

  it("keeps an endpoint that the app configured, for requests and form actions", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    configureCartEndpoint("/storefront/cart");

    const { container } = render(localizedCart(FR_CA, {}, createElement(CartForm)));

    expect(getFormAction(container)).toBe("/fr-ca/storefront/cart");
    await waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/storefront/cart"]));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("moves requests and form actions to a new locale without restarting the store", async () => {
    let refresh: (() => void) | undefined;
    function CaptureRefresh() {
      refresh = useCartActions().refresh;
      return null;
    }
    const tree = (locale: LocaleProviderProps["locale"]) =>
      localizedCart(
        locale,
        { initialData: { cart: CART } },
        createElement(CartForm),
        createElement(CaptureRefresh),
      );
    fetchMock.mockImplementationOnce(pendingUntilAborted);
    const { container, rerender } = render(tree(FR_CA));
    assert(refresh, "Expected the refresh action to be captured");
    refresh();
    await waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart"]));
    const [[, refreshInFlight]] = fetchMock.mock.calls;

    rerender(tree(EN_CA));

    // Restarting the store would abort the refresh that was in flight.
    expect(refreshInFlight.signal.aborted).toBe(false);
    expect(getFormAction(container)).toBe("/en-ca/api/cart");
    refresh();
    await waitFor(() => expect(requestedUrls()).toEqual(["/fr-ca/api/cart", "/en-ca/api/cart"]));
  });
});

describe("CartProvider without LocaleProvider", () => {
  it("warns in development on a page served under a locale path prefix", () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    (window as { Shopify?: unknown }).Shopify = { routes: { root: "/fr-ca/" } };

    render(createElement(CartProvider, { initialData: { cart: null } }));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no LocaleProvider"), {
      scope: "i18n",
    });
  });
});
