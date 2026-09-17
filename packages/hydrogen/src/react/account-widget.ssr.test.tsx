// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderShopifyAccountWidget } from "../core/account-widget";
import { assert } from "../core/test-utils";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

afterEach(() => vi.restoreAllMocks());

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
  document.body.append(container);
  const account = container.querySelector("shopify-account");
  const style = container.querySelector("style");
  assert(account, "expected a server-rendered shopify-account element");
  assert(style, "expected a server-rendered style element");
  const onRecoverableError = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  let root: Root | undefined;
  await act(async () => {
    root = hydrateRoot(container, createElement(ShopifyAccountWidget, props), {
      onRecoverableError,
    });
  });
  assert(root, "expected hydrateRoot to create a root");

  return { container, account, style, root, onRecoverableError, consoleError };
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
});

describe("ShopifyAccountWidget hydration", () => {
  it("hydrates server markup without mismatches and attaches handlers", async () => {
    const onOpen = vi.fn();
    const html = renderToString(createElement(ShopifyAccountWidget, baseProps));
    const { container, account, root, onRecoverableError, consoleError } = await hydrate(html, {
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

    await act(async () => root.unmount());
    container.remove();
  });

  it("suppresses hydration warnings caused by a concealed style nonce", async () => {
    const props = { ...fullProps, nonce: "nonce-1" };
    const html = renderToString(createElement(ShopifyAccountWidget, props));
    concealStyleNonceAttributes();

    const { container, style, root, onRecoverableError, consoleError } = await hydrate(html, props);

    expect(container.querySelector("style")).toBe(style);
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps hydration warnings for mismatched account attributes", async () => {
    const html = renderToString(createElement(ShopifyAccountWidget, baseProps)).replace(
      'sign-in-url="/account/login"',
      'sign-in-url="/unexpected"',
    );

    const { container, root, consoleError } = await hydrate(html, baseProps);

    expect(consoleError.mock.calls.flat().join(" ")).toContain("sign-in-url");

    await act(async () => root.unmount());
    container.remove();
  });
});
