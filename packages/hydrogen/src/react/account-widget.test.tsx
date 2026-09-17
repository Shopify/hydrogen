// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getShopifyAccountWidgetStructure } from "../core/account-widget";
import { assert } from "../core/test-utils";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const avatar = createElement("svg", { "data-avatar": "user", viewBox: "0 0 24 24" });
const baseProps: ShopifyAccountWidgetProps = {
  storeDomain: "your-store.myshopify.com",
  publicAccessToken: "public-token",
  signedOutAvatar: avatar,
};

/** Mirrors the CustomEvent Shopify's account bundle dispatches. */
function createAccountEvent(type: "open" | "close") {
  return new CustomEvent<null>(type, {
    bubbles: false,
    composed: true,
    cancelable: false,
    detail: null,
  });
}

function renderWidget(props: Partial<ShopifyAccountWidgetProps> = {}) {
  const result = render(createElement(ShopifyAccountWidget, { ...baseProps, ...props }));
  const rerender = (next: Partial<ShopifyAccountWidgetProps> = {}) =>
    result.rerender(createElement(ShopifyAccountWidget, { ...baseProps, ...next }));
  return { ...result, rerender, ...query(result.container) };
}

function query(container: HTMLElement) {
  const store = container.querySelector("shopify-store");
  const account = container.querySelector("shopify-account");
  const style = container.querySelector("shopify-account > style");
  const wrapper = container.querySelector("shopify-account > span");
  assert(store, "expected a shopify-store element");
  assert(account, "expected a shopify-account element");
  assert(style, "expected the footprint style element");
  assert(wrapper, "expected the signed-out avatar wrapper");
  return { store, account, style, wrapper };
}

function attributesOf(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes, (attr) => [attr.name, attr.value]));
}

describe("ShopifyAccountWidget", () => {
  describe("structure", () => {
    it("renders store > account > (style, avatar wrapper) using the core descriptors", () => {
      const structure = getShopifyAccountWidgetStructure({
        ...baseProps,
        customerAccessToken: "customer-token",
        menu: " main ",
        signInUrl: " /auth/login ",
        nonce: "nonce-1",
      });
      const { container, store, account, style, wrapper } = renderWidget({
        customerAccessToken: "customer-token",
        menu: " main ",
        signInUrl: " /auth/login ",
        nonce: "nonce-1",
      });

      expect(container.children).toHaveLength(1);
      expect(container.firstElementChild).toBe(store);
      expect(store.children).toHaveLength(1);
      expect(store.firstElementChild).toBe(account);
      expect(Array.from(account.children)).toEqual([style, wrapper]);
      expect(attributesOf(store)).toEqual(structure.store.attributes);
      expect(attributesOf(account)).toEqual(structure.account.attributes);
      expect(attributesOf(style)).toEqual(structure.style.attributes);
      expect(style.textContent).toBe(structure.style.textContent);
      expect(attributesOf(wrapper)).toEqual(structure.avatar.attributes);
      expect(wrapper.children).toHaveLength(1);
      assert(wrapper.firstElementChild, "expected the avatar inside the wrapper");
      expect(wrapper.firstElementChild.tagName.toLowerCase()).toBe("svg");
      expect(attributesOf(wrapper.firstElementChild)).toEqual({
        "data-avatar": "user",
        viewBox: "0 0 24 24",
      });
    });

    it("applies core defaults and omits optional attributes when absent", () => {
      const structure = getShopifyAccountWidgetStructure(baseProps);
      const { store, account, style } = renderWidget();

      expect(attributesOf(store)).toEqual(structure.store.attributes);
      expect(store.hasAttribute("customer-access-token")).toBe(false);
      expect(attributesOf(account)).toEqual(structure.account.attributes);
      expect(account.getAttribute("sign-in-url")).toBe("/account/login");
      expect(account.hasAttribute("menu")).toBe(false);
      expect(attributesOf(style)).toEqual({});
    });

    it("keeps the avatar wrapper node and placement stable when the avatar element changes", () => {
      const { account, wrapper, style, rerender } = renderWidget();

      rerender({ signedOutAvatar: createElement("svg", { "data-avatar": "next" }) });

      expect(account.children[1]).toBe(wrapper);
      expect(wrapper.previousElementSibling).toBe(style);
      expect(wrapper.getAttribute("slot")).toBe("signed-out-avatar");
      expect(wrapper.getAttribute("aria-hidden")).toBe("true");
      expect(wrapper.firstElementChild?.getAttribute("data-avatar")).toBe("next");
    });

    it("does not leak handler props onto the DOM", () => {
      const { store, account } = renderWidget({ onOpen: vi.fn(), onClose: vi.fn() });

      for (const element of [store, account]) {
        expect(element.hasAttribute("onOpen")).toBe(false);
        expect(element.hasAttribute("onopen")).toBe(false);
        expect(element.hasAttribute("onClose")).toBe(false);
        expect(element.hasAttribute("onclose")).toBe(false);
      }
    });
  });

  describe("events", () => {
    it("invokes onOpen with the native non-bubbling CustomEvent targeted at shopify-account", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const parentOpen = vi.fn();
      const { container, account } = renderWidget({ onOpen, onClose });
      container.addEventListener("open", parentOpen);
      const event = createAccountEvent("open");

      account.dispatchEvent(event);

      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen.mock.calls[0][0]).toBe(event);
      const received: CustomEvent<null> = onOpen.mock.calls[0][0];
      expect(received.type).toBe("open");
      expect(received.target).toBe(account);
      expect(received.detail).toBeNull();
      expect(received.bubbles).toBe(false);
      expect(received.composed).toBe(true);
      expect(received.cancelable).toBe(false);
      expect(parentOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("invokes onClose with the native close CustomEvent", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { account } = renderWidget({ onOpen, onClose });
      const event = createAccountEvent("close");

      account.dispatchEvent(event);

      expect(onClose).toHaveBeenCalledOnce();
      expect(onClose.mock.calls[0][0]).toBe(event);
      expect(onOpen).not.toHaveBeenCalled();
    });

    it("attaches the listeners directly to the account element", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { account } = renderWidget({ onOpen, onClose });
      const listeners = vi.spyOn(account, "removeEventListener");

      cleanup();

      expect(listeners).toHaveBeenCalledWith("open", onOpen);
      expect(listeners).toHaveBeenCalledWith("close", onClose);
    });

    it("replaces the handler without remounting the element", () => {
      const first = vi.fn();
      const second = vi.fn();
      const { store, account, rerender } = renderWidget({ onOpen: first });

      rerender({ onOpen: second });
      account.dispatchEvent(createAccountEvent("open"));

      expect(store.isConnected).toBe(true);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });

    it("removes the handler when the prop is dropped", () => {
      const onOpen = vi.fn();
      const { account, rerender } = renderWidget({ onOpen });

      rerender({});
      account.dispatchEvent(createAccountEvent("open"));

      expect(onOpen).not.toHaveBeenCalled();
    });

    it("adds a handler that was initially absent", () => {
      const onClose = vi.fn();
      const { account, rerender } = renderWidget();

      rerender({ onClose });
      account.dispatchEvent(createAccountEvent("close"));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("removes the listeners on unmount", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { account, unmount } = renderWidget({ onOpen, onClose });

      unmount();
      account.dispatchEvent(createAccountEvent("open"));
      account.dispatchEvent(createAccountEvent("close"));

      expect(onOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("store identity", () => {
    function expectRemount(
      from: Partial<ShopifyAccountWidgetProps>,
      to: Partial<ShopifyAccountWidgetProps>,
    ) {
      const onOpen = vi.fn();
      const { container, store, account, rerender } = renderWidget({ ...from, onOpen });

      rerender({ ...to, onOpen });
      const next = query(container);

      expect(next.store).not.toBe(store);
      expect(next.account).not.toBe(account);
      expect(store.isConnected).toBe(false);
      expect(container.children).toHaveLength(1);
      return { onOpen, previous: { store, account }, next };
    }

    function expectNoRemount(
      from: Partial<ShopifyAccountWidgetProps>,
      to: Partial<ShopifyAccountWidgetProps>,
    ) {
      const { container, store, account, wrapper, rerender } = renderWidget(from);

      rerender(to);
      const next = query(container);

      expect(next.store).toBe(store);
      expect(next.account).toBe(account);
      expect(next.wrapper).toBe(wrapper);
      return next;
    }

    it("remounts when a customer access token is added", () => {
      const { next } = expectRemount({}, { customerAccessToken: "customer-token" });

      expect(next.store.getAttribute("customer-access-token")).toBe("customer-token");
    });

    it("remounts when the customer access token changes", () => {
      const { next } = expectRemount(
        { customerAccessToken: "customer-token" },
        { customerAccessToken: "other-token" },
      );

      expect(next.store.getAttribute("customer-access-token")).toBe("other-token");
    });

    it("remounts when the customer access token is removed", () => {
      const { next } = expectRemount({ customerAccessToken: "customer-token" }, {});

      expect(next.store.hasAttribute("customer-access-token")).toBe(false);
    });

    it("remounts when the customer access token becomes null", () => {
      const { next } = expectRemount(
        { customerAccessToken: "customer-token" },
        { customerAccessToken: null },
      );

      expect(next.store.hasAttribute("customer-access-token")).toBe(false);
    });

    it("treats null and undefined tokens as the same signed-out identity", () => {
      expectNoRemount({ customerAccessToken: undefined }, { customerAccessToken: null });
      cleanup();
      expectNoRemount({ customerAccessToken: null }, {});
    });

    it("distinguishes an empty-string token from an absent one", () => {
      const { next } = expectRemount({}, { customerAccessToken: "" });
      expect(next.store.getAttribute("customer-access-token")).toBe("");
      cleanup();
      expectRemount({ customerAccessToken: "" }, { customerAccessToken: null });
    });

    it("remounts when the store domain or public access token changes", () => {
      expectRemount({}, { storeDomain: "other-store.myshopify.com" });
      cleanup();
      expectRemount({}, { publicAccessToken: "other-public-token" });
    });

    it("does not remount for unchanged identity or handler, menu and avatar changes", () => {
      expectNoRemount(
        { customerAccessToken: "customer-token", onOpen: vi.fn() },
        {
          customerAccessToken: "customer-token",
          onOpen: vi.fn(),
          onClose: vi.fn(),
          menu: "main",
          signInUrl: "/auth/login",
          signedOutAvatar: createElement("svg"),
        },
      );
    });

    it("attaches handlers to the remounted account element", () => {
      const { onOpen, previous, next } = expectRemount({}, { customerAccessToken: "token" });

      previous.account.dispatchEvent(createAccountEvent("open"));
      expect(onOpen).not.toHaveBeenCalled();

      const event = createAccountEvent("open");
      next.account.dispatchEvent(event);
      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen.mock.calls[0][0]).toBe(event);
    });
  });
});

describe("ShopifyAccountWidget props", () => {
  it("exposes a required signedOutAvatar element and no children API", () => {
    const props: ShopifyAccountWidgetProps = { ...baseProps, signedOutAvatar: avatar };
    const element: ReactElement = props.signedOutAvatar;

    expect(element).toBe(avatar);
    expect("children" in props).toBe(false);
  });
});
