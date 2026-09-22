import { describe, expect, it } from "vitest";

import { renderShopifyAccountWidget, type ShopifyAccountWidgetOptions } from "./account-widget";

const AVATAR = '<img src="/icons/icon-user.svg" alt="">';
const baseOptions: ShopifyAccountWidgetOptions = {
  storeDomain: "your-store.myshopify.com",
  publicAccessToken: "public-token",
  signedOutAvatarHtml: AVATAR,
};

describe("renderShopifyAccountWidget", () => {
  it("emits the shopify-store and shopify-account hierarchy", () => {
    const html = renderShopifyAccountWidget(baseOptions);

    expect(html).toMatch(
      /^<shopify-store store-domain="your-store\.myshopify\.com" public-access-token="public-token"><shopify-account data-hydrogen-account-widget sign-in-url="\/account\/login"><style>.*<\/style><span slot="signed-out-avatar" aria-hidden="true">.*<\/span><\/shopify-account><\/shopify-store>$/,
    );
  });

  it("wraps the trusted avatar HTML in the signed-out-avatar slot without escaping it", () => {
    const html = renderShopifyAccountWidget(baseOptions);

    expect(html).toContain(`<span slot="signed-out-avatar" aria-hidden="true">${AVATAR}</span>`);
    expect(html).not.toContain("&lt;img");
  });

  it("escapes attribute values", () => {
    const html = renderShopifyAccountWidget({
      ...baseOptions,
      storeDomain: 'a"b&c<d>e.myshopify.com',
      customerAccessToken: 'tok"en&<>',
      menu: 'main"menu',
      nonce: 'n"once&',
      signInUrl: "/login?next=/account&x=1",
    });

    expect(html).toContain('store-domain="a&quot;b&amp;c&lt;d&gt;e.myshopify.com"');
    expect(html).toContain('customer-access-token="tok&quot;en&amp;&lt;&gt;"');
    expect(html).toContain('menu="main&quot;menu"');
    expect(html).toContain('sign-in-url="/login?next=/account&amp;x=1"');
    expect(html).toContain('<style nonce="n&quot;once&amp;">');
  });

  it("serialises the customer access token only when provided", () => {
    expect(renderShopifyAccountWidget(baseOptions)).not.toContain("customer-access-token");
    expect(renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: null })).not.toContain(
      "customer-access-token",
    );
    expect(
      renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: undefined }),
    ).not.toContain("customer-access-token");
    expect(
      renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: "customer-token" }),
    ).toContain('customer-access-token="customer-token"');
  });

  it("omits blank customer access tokens and preserves non-blank tokens verbatim", () => {
    expect(renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: "" })).not.toContain(
      "customer-access-token",
    );
    expect(
      renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: "   " }),
    ).not.toContain("customer-access-token");
    expect(
      renderShopifyAccountWidget({ ...baseOptions, customerAccessToken: " customer-token " }),
    ).toContain('customer-access-token=" customer-token "');
  });

  it("defaults sign-in-url to /account/login and allows overriding it", () => {
    expect(renderShopifyAccountWidget(baseOptions)).toContain('sign-in-url="/account/login"');
    expect(renderShopifyAccountWidget({ ...baseOptions, signInUrl: "/auth/login" })).toContain(
      'sign-in-url="/auth/login"',
    );
  });

  it("emits the menu attribute only when provided", () => {
    expect(renderShopifyAccountWidget(baseOptions)).not.toContain("menu=");
    expect(
      renderShopifyAccountWidget({ ...baseOptions, menu: "customer-account-main-menu" }),
    ).toContain('menu="customer-account-main-menu"');
  });

  it("treats whitespace-only optional values as omitted", () => {
    const omitted = renderShopifyAccountWidget({
      ...baseOptions,
      signInUrl: "  ",
      menu: " ",
      nonce: " ",
    });

    expect(omitted).toContain('sign-in-url="/account/login"');
    expect(omitted).not.toContain("menu=");
    expect(omitted).toContain("<style>");

    const trimmed = renderShopifyAccountWidget({
      ...baseOptions,
      signInUrl: " /auth/login ",
      menu: " main ",
    });

    expect(trimmed).toContain('sign-in-url="/auth/login"');
    expect(trimmed).toContain('menu="main"');
  });

  it("applies the CSP nonce to the style element only", () => {
    const withNonce = renderShopifyAccountWidget({ ...baseOptions, nonce: "nonce-1" });
    expect(withNonce).toContain('<style nonce="nonce-1">');
    expect(withNonce).not.toContain("<shopify-account data-hydrogen-account-widget nonce");

    expect(renderShopifyAccountWidget(baseOptions)).toContain("<style>");
  });

  it("reserves the host and avatar wrapper dimensions with the Shopify size variable", () => {
    const html = renderShopifyAccountWidget(baseOptions);
    const size = "var(--shopify-account-avatar-size, 44px)";

    expect(html).toContain(
      `[data-hydrogen-account-widget]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${size};height:${size};vertical-align:middle}`,
    );
    expect(html).toContain(
      `[data-hydrogen-account-widget]>[slot=signed-out-avatar]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${size};height:${size}}`,
    );
    expect(html).not.toContain(":defined");
  });

  it("does not use style attributes or emit shadow DOM", () => {
    const html = renderShopifyAccountWidget({ ...baseOptions, nonce: "nonce-1" });

    expect(html).not.toContain(' style="');
    expect(html).not.toContain("shadowrootmode");
    expect(html).not.toContain("<template");
  });
});
