// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import { ShopifyAccount } from "./account";
import { LocaleProvider } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;

describe("ShopifyAccount", () => {
  it("points the component at the widget data and login routes", () => {
    const element = mount(ShopifyAccount).get("shopify-account");

    expect(element.attributes("account-data-url")).toBe("/account/widget-data");
    expect(element.attributes("sign-in-url")).toBe("/account/login");
  });

  it("puts both routes under the locale's path prefix and follows a locale change", async () => {
    const wrapper = mount(LocaleProvider, {
      props: { locale: FR_CA },
      slots: { default: () => h(ShopifyAccount) },
    });
    expect(wrapper.get("shopify-account").attributes("account-data-url")).toBe(
      "/fr-ca/account/widget-data",
    );
    expect(wrapper.get("shopify-account").attributes("sign-in-url")).toBe("/fr-ca/account/login");

    await wrapper.setProps({ locale: EN_CA });

    expect(wrapper.get("shopify-account").attributes("account-data-url")).toBe(
      "/en-ca/account/widget-data",
    );
  });

  it("puts the signed-out avatar in the component's slot without affecting layout", () => {
    const wrapper = mount(ShopifyAccount, {
      slots: { signedOutAvatar: () => h("span", "Sign in") },
    });

    const slotted = wrapper.get('shopify-account > [slot="signed-out-avatar"]');
    expect(slotted.attributes("style")).toBe("display: contents;");
    expect(slotted.html()).toContain("<span>Sign in</span>");
  });

  it("renders no slot without a signed-out avatar", () => {
    expect(mount(ShopifyAccount).get("shopify-account").element.children).toHaveLength(0);
  });
});
