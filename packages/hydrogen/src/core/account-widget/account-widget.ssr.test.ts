import { describe, expect, it } from "vitest";

import {
  ACCOUNT_WIDGET_ATTRIBUTE,
  ACCOUNT_WIDGET_STYLES,
  getShopifyAccountWidgetStructure,
  renderShopifyAccountWidget,
  type ShopifyAccountWidgetOptions,
} from "./account-widget";

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

  it("renders only the owner marker bare; empty-string values keep an explicit empty value", () => {
    const html = renderShopifyAccountWidget({
      ...baseOptions,
      publicAccessToken: "",
      customerAccessToken: "",
    });

    expect(html).toContain(
      '<shopify-store store-domain="your-store.myshopify.com" public-access-token="" customer-access-token="">',
    );
    expect(html).toContain(`<shopify-account ${ACCOUNT_WIDGET_ATTRIBUTE} sign-in-url=`);
    expect(html).not.toMatch(/ public-access-token[ >]/);
    expect(html).not.toMatch(/ customer-access-token[ >]/);
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

function serialize(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes)
    .map(([name, value]) =>
      name === ACCOUNT_WIDGET_ATTRIBUTE && value === "" ? name : `${name}="${value}"`,
    )
    .join(" ");
}

describe("getShopifyAccountWidgetStructure", () => {
  const { signedOutAvatarHtml: _avatar, ...structureOptions } = baseOptions;

  it("describes the store, account, style and avatar elements with defaults applied", () => {
    expect(getShopifyAccountWidgetStructure(structureOptions)).toEqual({
      store: {
        tagName: "shopify-store",
        attributes: {
          "store-domain": "your-store.myshopify.com",
          "public-access-token": "public-token",
        },
      },
      account: {
        tagName: "shopify-account",
        attributes: {
          [ACCOUNT_WIDGET_ATTRIBUTE]: "",
          "sign-in-url": "/account/login",
        },
      },
      style: {
        tagName: "style",
        attributes: {},
        textContent: ACCOUNT_WIDGET_STYLES,
      },
      avatar: {
        tagName: "span",
        attributes: { slot: "signed-out-avatar", "aria-hidden": "true" },
      },
    });
  });

  it("places the owner marker first on the account element as a bare attribute", () => {
    const { account } = getShopifyAccountWidgetStructure(structureOptions);

    expect(Object.keys(account.attributes)[0]).toBe(ACCOUNT_WIDGET_ATTRIBUTE);
    expect(account.attributes[ACCOUNT_WIDGET_ATTRIBUTE]).toBe("");
  });

  it("includes optional attributes only when provided and trims them", () => {
    const structure = getShopifyAccountWidgetStructure({
      ...structureOptions,
      customerAccessToken: "customer-token",
      menu: " main ",
      signInUrl: " /auth/login ",
      nonce: " nonce-1 ",
    });

    expect(structure.store.attributes["customer-access-token"]).toBe("customer-token");
    expect(structure.account.attributes).toEqual({
      [ACCOUNT_WIDGET_ATTRIBUTE]: "",
      "sign-in-url": "/auth/login",
      menu: "main",
    });
    expect(structure.style.attributes).toEqual({ nonce: "nonce-1" });
  });

  it("treats null, undefined and whitespace-only optional values as omitted", () => {
    const omitted = getShopifyAccountWidgetStructure({
      ...structureOptions,
      customerAccessToken: null,
      menu: " ",
      signInUrl: "",
      nonce: "  ",
    });

    expect(omitted.store.attributes).not.toHaveProperty("customer-access-token");
    expect(omitted.account.attributes).not.toHaveProperty("menu");
    expect(omitted.account.attributes["sign-in-url"]).toBe("/account/login");
    expect(omitted.style.attributes).toEqual({});

    const undefinedToken = getShopifyAccountWidgetStructure({
      ...structureOptions,
      customerAccessToken: undefined,
    });
    expect(undefinedToken.store.attributes).not.toHaveProperty("customer-access-token");
  });

  it("returns raw attribute values and CSS so consumers own escaping", () => {
    const structure = getShopifyAccountWidgetStructure({
      ...structureOptions,
      storeDomain: 'a"b&c<d>e.myshopify.com',
      nonce: 'n"once&',
    });

    expect(structure.store.attributes["store-domain"]).toBe('a"b&c<d>e.myshopify.com');
    expect(structure.style.attributes.nonce).toBe('n"once&');
    expect(structure.style.textContent).toBe(ACCOUNT_WIDGET_STYLES);
  });

  it("is the single source the string renderer serialises from", () => {
    const options: ShopifyAccountWidgetOptions = {
      ...baseOptions,
      customerAccessToken: "customer-token",
      menu: "customer-account-main-menu",
      signInUrl: "/auth/login",
      nonce: "nonce-1",
    };
    const { store, account, style, avatar } = getShopifyAccountWidgetStructure(options);

    expect(renderShopifyAccountWidget(options)).toBe(
      `<${store.tagName} ${serialize(store.attributes)}>` +
        `<${account.tagName} ${serialize(account.attributes)}>` +
        `<${style.tagName} ${serialize(style.attributes)}>${style.textContent}</${style.tagName}>` +
        `<${avatar.tagName} ${serialize(avatar.attributes)}>${AVATAR}</${avatar.tagName}>` +
        `</${account.tagName}>` +
        `</${store.tagName}>`,
    );
  });
});
