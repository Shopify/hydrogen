// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderShopifyAccountWidget } from "../core/account-widget";
import { assert } from "../core/test-utils";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

const mounted: Array<{ container: HTMLElement; root?: Root }> = [];

afterEach(async () => {
  const entries = mounted.splice(0);
  try {
    for (const { root } of entries) {
      if (root) await act(async () => root.unmount());
    }
  } finally {
    for (const { container } of entries) container.remove();
    vi.restoreAllMocks();
  }
});

const AVATAR_HTML = '<svg data-avatar="user" viewBox="0 0 24 24"></svg>';
const baseProps: ShopifyAccountWidgetProps = {
  storeDomain: "your-store.myshopify.com",
  publicAccessToken: "public-token",
  signedOutAvatar: createElement("svg", { "data-avatar": "user", viewBox: "0 0 24 24" }),
};
const fullProps: ShopifyAccountWidgetProps = {
  ...baseProps,
  customerAccessToken: 'tok"en&<>',
  menu: "customer-account-main-menu",
  signInUrl: "/login?next=/account&x=1",
  nonce: "nonce-1",
};

function parse(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

function describeTree(root: ParentNode): unknown {
  return Array.from(root.children, (element) => ({
    tagName: element.tagName.toLowerCase(),
    attributes: Object.fromEntries(
      Array.from(element.attributes, (attr) => [attr.name, attr.value]),
    ),
    text: element.tagName === "STYLE" ? element.textContent : undefined,
    children: describeTree(element),
  }));
}

function concealStyleNonceAttributes() {
  const getAttribute = HTMLStyleElement.prototype.getAttribute;

  vi.spyOn(HTMLStyleElement.prototype, "getAttribute").mockImplementation(
    function (this: HTMLStyleElement, name) {
      return name.toLowerCase() === "nonce" ? "" : getAttribute.call(this, name);
    },
  );
}

async function hydrate(html: string, props: ShopifyAccountWidgetProps) {
  const container = parse(html);
  const entry: (typeof mounted)[number] = { container };
  mounted.push(entry);
  document.body.append(container);
  const account = container.querySelector("shopify-account");
  const style = container.querySelector("style");
  assert(account, "expected a server-rendered shopify-account element");
  assert(style, "expected a server-rendered style element");
  const onRecoverableError = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  await act(async () => {
    entry.root = hydrateRoot(container, createElement(ShopifyAccountWidget, props), {
      onRecoverableError,
    });
  });
  const { root } = entry;
  assert(root, "expected hydrateRoot to create a root");

  return { container, account, style, onRecoverableError, consoleError };
}

describe("ShopifyAccountWidget SSR", () => {
  it("renders the same DOM tree as the core string renderer", () => {
    const { signedOutAvatar: _avatar, ...options } = fullProps;
    const react = renderToStaticMarkup(createElement(ShopifyAccountWidget, fullProps));
    const core = renderShopifyAccountWidget({ ...options, signedOutAvatarHtml: AVATAR_HTML });

    expect(describeTree(parse(react))).toEqual(describeTree(parse(core)));
  });

  it("renders the same DOM tree as the core string renderer with defaults", () => {
    const { signedOutAvatar: _avatar, ...options } = baseProps;
    const react = renderToStaticMarkup(createElement(ShopifyAccountWidget, baseProps));
    const core = renderShopifyAccountWidget({ ...options, signedOutAvatarHtml: AVATAR_HTML });

    expect(describeTree(parse(react))).toEqual(describeTree(parse(core)));
    expect(react).toContain('sign-in-url="/account/login"');
    expect(react).not.toContain("customer-access-token");
    expect(react).not.toContain("menu=");
    expect(react).toContain("<style>");
  });

  it("emits the footprint CSS unescaped and the nonce only on the style element", () => {
    const html = renderToStaticMarkup(createElement(ShopifyAccountWidget, fullProps));

    expect(html).toContain('<style nonce="nonce-1">');
    expect(html).toContain("[data-hydrogen-account-widget]>[slot=signed-out-avatar]");
    expect(html).not.toContain("&gt;[slot");
    expect(html.match(/nonce=/g)).toHaveLength(1);
    expect(html).not.toContain("suppressHydrationWarning");
    expect(html).not.toContain("onOpen");
  });

  it("does not serialise handler props", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyAccountWidget, { ...baseProps, onOpen: vi.fn(), onClose: vi.fn() }),
    );

    expect(html).not.toMatch(/on(open|close)/i);
  });

  it.each([
    { label: "undefined", signedOutAvatar: undefined },
    { label: "null", signedOutAvatar: null },
  ])("throws a synchronous TypeError when signedOutAvatar is $label", ({ signedOutAvatar }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Models JS callers bypassing the required `ReactElement` prop type.
    const props: ShopifyAccountWidgetProps = {
      ...baseProps,
      signedOutAvatar: signedOutAvatar as unknown as ReactElement,
    };
    const expected = new TypeError("ShopifyAccountWidget requires the signedOutAvatar prop.");

    expect(() => renderToString(createElement(ShopifyAccountWidget, props))).toThrowError(expected);
    expect(() => renderToStaticMarkup(createElement(ShopifyAccountWidget, props))).toThrowError(
      expected,
    );
  });
});

describe("ShopifyAccountWidget hydration", () => {
  it("hydrates server markup without mismatches and attaches handlers", async () => {
    const onOpen = vi.fn();
    const html = renderToString(createElement(ShopifyAccountWidget, baseProps));
    const { container, account, onRecoverableError, consoleError } = await hydrate(html, {
      ...baseProps,
      onOpen,
    });

    expect(container.querySelector("shopify-account")).toBe(account);
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    const event = new CustomEvent<null>("open", { composed: true, detail: null });
    account.dispatchEvent(event);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen.mock.calls[0][0]).toBe(event);
  });

  it("suppresses hydration warnings caused by a concealed style nonce", async () => {
    const props = { ...fullProps, nonce: "nonce-1" };
    const html = renderToString(createElement(ShopifyAccountWidget, props));
    concealStyleNonceAttributes();

    const { container, style, onRecoverableError, consoleError } = await hydrate(html, props);

    expect(container.querySelector("style")).toBe(style);
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    { label: "without a nonce", props: baseProps, concealNonce: false },
    { label: "with a concealed style nonce", props: fullProps, concealNonce: true },
  ])(
    "keeps hydration warnings for mismatched account attributes $label",
    async ({ props, concealNonce }) => {
      const html = renderToString(createElement(ShopifyAccountWidget, props)).replace(
        /sign-in-url="[^"]*"/,
        'sign-in-url="/unexpected"',
      );
      if (concealNonce) concealStyleNonceAttributes();

      const { consoleError } = await hydrate(html, props);

      expect(consoleError.mock.calls.flat().join(" ")).toContain("sign-in-url");
    },
  );
});
