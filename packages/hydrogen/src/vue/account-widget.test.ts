// @vitest-environment happy-dom
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, type VNode } from "vue";

import { getShopifyAccountWidgetStructure } from "../core/account-widget";
import { assert } from "../core/test-utils";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const avatar = () => [h("img", { src: "/icons/icon-user.svg", alt: "" })];
const baseProps: ShopifyAccountWidgetProps = {
  storeDomain: "your-store.myshopify.com",
  publicAccessToken: "public-token",
};

type WidgetHandlers = {
  onOpen?: (event: CustomEvent<null>) => void;
  onClose?: (event: CustomEvent<null>) => void;
};
type WidgetProps = Partial<ShopifyAccountWidgetProps> & WidgetHandlers;

const clearedProps: Record<Exclude<keyof WidgetProps, keyof ShopifyAccountWidgetProps>, undefined> &
  Record<Exclude<keyof ShopifyAccountWidgetProps, "storeDomain" | "publicAccessToken">, undefined> =
  {
    customerAccessToken: undefined,
    menu: undefined,
    signInUrl: undefined,
    nonce: undefined,
    onOpen: undefined,
    onClose: undefined,
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

function mountWidget(props: WidgetProps = {}, signedOutAvatar: () => VNode[] = avatar) {
  const wrapper = mount(ShopifyAccountWidget, {
    props: { ...baseProps, ...props },
    slots: { "signed-out-avatar": signedOutAvatar },
    attachTo: document.body,
  });
  // VTU merges setProps, so omitted keys are reset explicitly to mirror a fresh render.
  const rerender = (next: WidgetProps = {}) =>
    wrapper.setProps({ ...clearedProps, ...baseProps, ...next });
  return { wrapper, rerender, ...query(wrapper) };
}

function query(wrapper: VueWrapper) {
  const container = wrapper.element.parentElement;
  assert(container, "expected the widget to be attached");
  const store = container.querySelector("shopify-store");
  const account = container.querySelector("shopify-account");
  const style = container.querySelector("shopify-account > style");
  const avatarWrapper = container.querySelector("shopify-account > span");
  assert(store, "expected a shopify-store element");
  assert(account, "expected a shopify-account element");
  assert(style, "expected the footprint style element");
  assert(avatarWrapper, "expected the signed-out avatar wrapper");
  return { container, store, account, style, avatarWrapper };
}

function attributesOf(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes, (attr) => [attr.name, attr.value]));
}

describe("ShopifyAccountWidget", () => {
  describe("structure", () => {
    it("renders store > account > (style, avatar wrapper) using the core descriptors", () => {
      const options = {
        customerAccessToken: "customer-token",
        menu: " main ",
        signInUrl: " /auth/login ",
        nonce: "nonce-1",
      };
      const structure = getShopifyAccountWidgetStructure({ ...baseProps, ...options });
      const { container, store, account, style, avatarWrapper } = mountWidget(options);

      expect(container.children).toHaveLength(1);
      expect(container.firstElementChild).toBe(store);
      expect(store.children).toHaveLength(1);
      expect(store.firstElementChild).toBe(account);
      expect(Array.from(account.children)).toEqual([style, avatarWrapper]);
      expect(attributesOf(store)).toEqual(structure.store.attributes);
      expect(attributesOf(account)).toEqual(structure.account.attributes);
      expect(attributesOf(style)).toEqual(structure.style.attributes);
      expect(style.textContent).toBe(structure.style.textContent);
      expect(attributesOf(avatarWrapper)).toEqual(structure.avatar.attributes);
      expect(avatarWrapper.innerHTML).toBe('<img src="/icons/icon-user.svg" alt="">');
    });

    it("applies core defaults and omits optional attributes when absent", () => {
      const structure = getShopifyAccountWidgetStructure(baseProps);
      const { store, account, style } = mountWidget();

      expect(attributesOf(store)).toEqual(structure.store.attributes);
      expect(store.hasAttribute("customer-access-token")).toBe(false);
      expect(attributesOf(account)).toEqual(structure.account.attributes);
      expect(account.getAttribute("sign-in-url")).toBe("/account/login");
      expect(account.hasAttribute("menu")).toBe(false);
      expect(attributesOf(style)).toEqual({});
    });

    it("keeps the avatar wrapper node and placement stable when the avatar content changes", async () => {
      const wrapper = mount(
        {
          components: { ShopifyAccountWidget },
          props: { next: Boolean },
          template: `
            <ShopifyAccountWidget store-domain="your-store.myshopify.com" public-access-token="public-token">
              <template #signed-out-avatar>
                <svg v-if="next" data-avatar="next" />
                <img v-else src="/icons/icon-user.svg" alt="" />
              </template>
            </ShopifyAccountWidget>
          `,
        },
        { attachTo: document.body },
      );
      const { store, account, style, avatarWrapper } = query(wrapper);

      await wrapper.setProps({ next: true });

      let next = query(wrapper);
      expect(next.store).toBe(store);
      expect(next.account).toBe(account);
      expect(next.avatarWrapper).toBe(avatarWrapper);
      expect(account.children[1]).toBe(avatarWrapper);
      expect(avatarWrapper.previousElementSibling).toBe(style);
      expect(avatarWrapper.getAttribute("slot")).toBe("signed-out-avatar");
      expect(avatarWrapper.getAttribute("aria-hidden")).toBe("true");
      expect(avatarWrapper.children).toHaveLength(1);
      expect(avatarWrapper.firstElementChild?.getAttribute("data-avatar")).toBe("next");

      await wrapper.setProps({ next: false });

      next = query(wrapper);
      expect(next.store).toBe(store);
      expect(next.account).toBe(account);
      expect(next.avatarWrapper).toBe(avatarWrapper);
      expect(avatarWrapper.children).toHaveLength(1);
      expect(avatarWrapper.querySelector("svg")).toBeNull();
      expect(avatarWrapper.firstElementChild?.tagName.toLowerCase()).toBe("img");
      expect(avatarWrapper.firstElementChild?.getAttribute("src")).toBe("/icons/icon-user.svg");
    });

    it("does not fall through attributes or leak handlers onto the owned structure", () => {
      const structure = getShopifyAccountWidgetStructure(baseProps);
      const wrapper = mount(ShopifyAccountWidget, {
        props: { ...baseProps, onOpen: vi.fn(), onClose: vi.fn() },
        attrs: { class: "extra", id: "widget", "data-owner": "app", "store-domain": "other" },
        slots: { "signed-out-avatar": avatar },
        attachTo: document.body,
      });
      const { store, account } = query(wrapper);

      expect(attributesOf(store)).toEqual(structure.store.attributes);
      expect(attributesOf(account)).toEqual(structure.account.attributes);
      for (const element of [store, account]) {
        expect(element.hasAttribute("class")).toBe(false);
        expect(element.hasAttribute("id")).toBe(false);
        expect(element.hasAttribute("data-owner")).toBe(false);
        expect(element.getAttributeNames().some((name: string) => /^on/i.test(name))).toBe(false);
      }
    });

    it("ignores a default slot instead of rendering it", () => {
      const wrapper = mount(ShopifyAccountWidget, {
        props: baseProps,
        // @ts-expect-error the widget has no default slot
        slots: { "signed-out-avatar": avatar, default: () => h("b", "ignored") },
        attachTo: document.body,
      });
      const { account, avatarWrapper } = query(wrapper);

      expect(account.querySelector("b")).toBeNull();
      expect(Array.from(account.children)).toEqual([account.firstElementChild, avatarWrapper]);
    });
  });

  describe("required slot", () => {
    it("throws a synchronous TypeError when the signed-out-avatar slot is missing", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => mount(ShopifyAccountWidget, { props: baseProps })).toThrowError(
        new TypeError(
          'ShopifyAccountWidget requires the "signed-out-avatar" slot for the avatar shown before Shopify\'s component loads.',
        ),
      );
      expect(document.querySelector("shopify-store")).toBeNull();
    });

    it("does not accept the avatar through the default slot", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() =>
        // @ts-expect-error the widget has no default slot
        mount(ShopifyAccountWidget, { props: baseProps, slots: { default: avatar } }),
      ).toThrowError(TypeError);
    });
  });

  describe("events", () => {
    it("emits open with the native non-bubbling CustomEvent targeted at shopify-account", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const parentOpen = vi.fn();
      const { wrapper, container, account } = mountWidget({ onOpen, onClose });
      container.addEventListener("open", parentOpen);
      const event = createAccountEvent("open");

      account.dispatchEvent(event);

      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen.mock.calls[0]).toEqual([event]);
      expect(onOpen.mock.calls[0][0]).toBe(event);
      const received: CustomEvent<null> = onOpen.mock.calls[0][0];
      expect(received.type).toBe("open");
      expect(received.target).toBe(account);
      expect(received.detail).toBeNull();
      expect(received.bubbles).toBe(false);
      expect(received.composed).toBe(true);
      expect(received.cancelable).toBe(false);
      expect(wrapper.emitted("open")).toEqual([[event]]);
      expect(parentOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("emits close with the native close CustomEvent", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { wrapper, account } = mountWidget({ onOpen, onClose });
      const event = createAccountEvent("close");

      account.dispatchEvent(event);

      expect(onClose).toHaveBeenCalledOnce();
      expect(onClose.mock.calls[0][0]).toBe(event);
      expect(wrapper.emitted("close")).toEqual([[event]]);
      expect(onOpen).not.toHaveBeenCalled();
    });

    it("attaches one open and one close listener directly to the account element", async () => {
      const { wrapper, account, rerender } = mountWidget({ onOpen: vi.fn() });
      const added = vi.spyOn(account, "addEventListener");
      const removed = vi.spyOn(account, "removeEventListener");

      await rerender({ menu: "main", onOpen: vi.fn(), onClose: vi.fn() });
      expect(added).not.toHaveBeenCalled();
      expect(removed).not.toHaveBeenCalled();

      wrapper.unmount();
      expect(removed).toHaveBeenCalledTimes(2);
      expect(removed).toHaveBeenCalledWith("open", expect.any(Function));
      expect(removed).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("replaces the handler without remounting the element", async () => {
      const first = vi.fn();
      const second = vi.fn();
      const { store, account, rerender } = mountWidget({ onOpen: first });

      await rerender({ onOpen: second });
      account.dispatchEvent(createAccountEvent("open"));

      expect(store.isConnected).toBe(true);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });

    it("stops calling the handler when the prop is dropped", async () => {
      const onOpen = vi.fn();
      const { account, rerender } = mountWidget({ onOpen });

      await rerender({ onOpen: undefined });
      account.dispatchEvent(createAccountEvent("open"));

      expect(onOpen).not.toHaveBeenCalled();
    });

    it("calls a handler that was initially absent", async () => {
      const onClose = vi.fn();
      const { account, rerender } = mountWidget();

      await rerender({ onClose });
      account.dispatchEvent(createAccountEvent("close"));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("removes the listeners on unmount", () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { wrapper, account } = mountWidget({ onOpen, onClose });

      wrapper.unmount();
      account.dispatchEvent(createAccountEvent("open"));
      account.dispatchEvent(createAccountEvent("close"));

      expect(onOpen).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("store identity", () => {
    async function expectRemount(from: WidgetProps, to: WidgetProps) {
      const onOpen = vi.fn();
      const { wrapper, container, store, account, rerender } = mountWidget({ ...from, onOpen });

      await rerender({ ...to, onOpen });
      const next = query(wrapper);

      expect(next.store).not.toBe(store);
      expect(next.account).not.toBe(account);
      expect(store.isConnected).toBe(false);
      expect(container.children).toHaveLength(1);
      return { onOpen, previous: { store, account }, next };
    }

    async function expectNoRemount(from: WidgetProps, to: WidgetProps) {
      const { wrapper, store, account, avatarWrapper, rerender } = mountWidget(from);

      await rerender(to);
      const next = query(wrapper);

      expect(next.store).toBe(store);
      expect(next.account).toBe(account);
      expect(next.avatarWrapper).toBe(avatarWrapper);
      return next;
    }

    it("remounts when a customer access token is added", async () => {
      const { next } = await expectRemount({}, { customerAccessToken: "customer-token" });

      expect(next.store.getAttribute("customer-access-token")).toBe("customer-token");
    });

    it("remounts when the customer access token changes", async () => {
      const { next } = await expectRemount(
        { customerAccessToken: "customer-token" },
        { customerAccessToken: "other-token" },
      );

      expect(next.store.getAttribute("customer-access-token")).toBe("other-token");
    });

    it("remounts when the customer access token is removed", async () => {
      const { next } = await expectRemount({ customerAccessToken: "customer-token" }, {});

      expect(next.store.hasAttribute("customer-access-token")).toBe(false);
    });

    it("remounts when the customer access token becomes null", async () => {
      const { next } = await expectRemount(
        { customerAccessToken: "customer-token" },
        { customerAccessToken: null },
      );

      expect(next.store.hasAttribute("customer-access-token")).toBe(false);
    });

    it("treats null and undefined tokens as the same signed-out identity", async () => {
      await expectNoRemount({ customerAccessToken: undefined }, { customerAccessToken: null });
      document.body.innerHTML = "";
      await expectNoRemount({ customerAccessToken: null }, {});
    });

    it("distinguishes an empty-string token from an absent one", async () => {
      const { next } = await expectRemount({}, { customerAccessToken: "" });
      expect(next.store.getAttribute("customer-access-token")).toBe("");
      document.body.innerHTML = "";
      await expectRemount({ customerAccessToken: "" }, { customerAccessToken: null });
    });

    it("remounts when the store domain or public access token changes", async () => {
      await expectRemount({}, { storeDomain: "other-store.myshopify.com" });
      document.body.innerHTML = "";
      await expectRemount({}, { publicAccessToken: "other-public-token" });
    });

    it("does not remount for unchanged identity or handler, menu and sign-in changes", async () => {
      const next = await expectNoRemount(
        { customerAccessToken: "customer-token", onOpen: vi.fn() },
        {
          customerAccessToken: "customer-token",
          onOpen: vi.fn(),
          onClose: vi.fn(),
          menu: "main",
          signInUrl: "/auth/login",
        },
      );

      expect(next.account.getAttribute("menu")).toBe("main");
      expect(next.account.getAttribute("sign-in-url")).toBe("/auth/login");
    });

    it("removes menu and restores the default sign-in-url without remounting", async () => {
      const next = await expectNoRemount(
        { customerAccessToken: "customer-token", menu: "main", signInUrl: "/auth/login" },
        { customerAccessToken: "customer-token" },
      );

      expect(next.account.hasAttribute("menu")).toBe(false);
      expect(next.account.getAttribute("sign-in-url")).toBe("/account/login");
    });

    it("moves the listeners to the remounted account element", async () => {
      const { onOpen, previous, next } = await expectRemount({}, { customerAccessToken: "token" });

      previous.account.dispatchEvent(createAccountEvent("open"));
      expect(onOpen).not.toHaveBeenCalled();

      const event = createAccountEvent("open");
      next.account.dispatchEvent(event);
      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen.mock.calls[0][0]).toBe(event);
    });
  });
});
