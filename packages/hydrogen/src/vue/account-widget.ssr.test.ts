// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createSSRApp, h, nextTick, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";

import { renderShopifyAccountWidget } from "../core/account-widget";
import { assert } from "../core/test-utils";
import { ShopifyAccountWidget, type ShopifyAccountWidgetProps } from "./account-widget";

const mounted: Array<{ container: HTMLElement; app?: App }> = [];

afterEach(() => {
  const entries = mounted.splice(0);
  try {
    for (const { app } of entries) app?.unmount();
  } finally {
    for (const { container } of entries) container.remove();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  }
});

const AVATAR_HTML = '<img src="/icons/icon-user.svg" alt="">';
const avatar = () => [h("img", { src: "/icons/icon-user.svg", alt: "" })];
const baseProps: ShopifyAccountWidgetProps = {
  storeDomain: "your-store.myshopify.com",
  publicAccessToken: "public-token",
};
const fullProps: ShopifyAccountWidgetProps = {
  ...baseProps,
  customerAccessToken: 'tok"en&<>',
  menu: "customer-account-main-menu",
  signInUrl: "/login?next=/account&x=1",
  nonce: "nonce-1",
};

type WidgetHandlers = { onOpen?: (event: CustomEvent<null>) => void };

function render(props: ShopifyAccountWidgetProps & WidgetHandlers, avatarSlot = avatar) {
  return renderToString(h(ShopifyAccountWidget, props, { "signed-out-avatar": avatarSlot }));
}

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

async function hydrate(
  html: string,
  props: ShopifyAccountWidgetProps & WidgetHandlers,
  avatarSlot: () => VNode[] = avatar,
) {
  const container = parse(html);
  const entry: (typeof mounted)[number] = { container };
  mounted.push(entry);
  document.body.append(container);
  const store = container.querySelector("shopify-store");
  const account = container.querySelector("shopify-account");
  const style = container.querySelector("style");
  const image = container.querySelector("shopify-account > span > img");
  assert(store, "expected a server-rendered shopify-store element");
  assert(account, "expected a server-rendered shopify-account element");
  assert(style, "expected a server-rendered style element");
  assert(image, "expected the server-rendered avatar");
  const warnHandler = vi.fn();
  const errorHandler = vi.fn();
  const app = createSSRApp({
    render: () => h(ShopifyAccountWidget, props, { "signed-out-avatar": avatarSlot }),
  });
  app.config.warnHandler = warnHandler;
  app.config.errorHandler = errorHandler;
  entry.app = app;

  app.mount(container);
  await nextTick();

  return { container, store, account, style, image, warnHandler, errorHandler };
}

describe("ShopifyAccountWidget SSR", () => {
  it("renders the same DOM tree as the core string renderer", async () => {
    const vue = await render(fullProps);
    const core = renderShopifyAccountWidget({ ...fullProps, signedOutAvatarHtml: AVATAR_HTML });

    expect(describeTree(parse(vue))).toEqual(describeTree(parse(core)));
  });

  it("renders the same DOM tree as the core string renderer with defaults", async () => {
    const vue = await render(baseProps);
    const core = renderShopifyAccountWidget({ ...baseProps, signedOutAvatarHtml: AVATAR_HTML });

    expect(describeTree(parse(vue))).toEqual(describeTree(parse(core)));
    expect(vue).toContain('sign-in-url="/account/login"');
    expect(vue).not.toContain("customer-access-token");
    expect(vue).not.toContain("menu=");
    expect(vue).toContain("<style>");
  });

  it("emits the footprint CSS unescaped and the nonce only on the style element", async () => {
    const html = await render(fullProps);

    expect(html).toContain('<style nonce="nonce-1">');
    expect(html).toContain("[data-hydrogen-account-widget]>[slot=signed-out-avatar]");
    expect(html).not.toContain("&gt;[slot");
    expect(html.match(/nonce=/g)).toHaveLength(1);
    expect(html).not.toContain("<template");
    expect(html).not.toContain("shadowrootmode");
  });

  it("does not serialise handlers", async () => {
    const html = await render({ ...baseProps, onOpen: vi.fn() });

    expect(html).not.toMatch(/on(open|close)/i);
  });

  it("rejects synchronously-thrown errors when the required slot is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(renderToString(h(ShopifyAccountWidget, baseProps))).rejects.toThrowError(
      TypeError,
    );
  });
});

describe("ShopifyAccountWidget hydration", () => {
  it("hydrates server markup without mismatches and attaches handlers", async () => {
    const onOpen = vi.fn();
    const html = await render(baseProps);
    const { container, store, account, style, image, warnHandler, errorHandler } = await hydrate(
      html,
      { ...baseProps, onOpen },
    );

    expect(container.querySelector("shopify-store")).toBe(store);
    expect(container.querySelector("shopify-account")).toBe(account);
    expect(container.querySelector("style")).toBe(style);
    expect(container.querySelector("shopify-account > span > img")).toBe(image);
    expect(warnHandler).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();

    const event = new CustomEvent<null>("open", { composed: true, detail: null });
    account.dispatchEvent(event);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen.mock.calls[0][0]).toBe(event);
  });

  it("hydrates without warnings when the browser conceals the style nonce", async () => {
    const html = await render(fullProps);
    concealStyleNonceAttributes();

    const { container, style, warnHandler, errorHandler } = await hydrate(html, fullProps);

    expect(container.querySelector("style")).toBe(style);
    expect(style.getAttribute("nonce")).toBe("");
    expect(warnHandler).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it.each([
    { label: "without a nonce", props: baseProps, concealNonce: false },
    {
      label: "with a concealed style nonce",
      props: { ...baseProps, nonce: "nonce-1" },
      concealNonce: true,
    },
  ])(
    "keeps hydration warnings for mismatched owned attributes $label",
    async ({ props, concealNonce }) => {
      const html = (await render(props)).replace('slot="signed-out-avatar"', 'slot="unexpected"');
      if (concealNonce) concealStyleNonceAttributes();

      const { warnHandler } = await hydrate(html, props);

      expect(warnHandler.mock.calls.map(([message]) => message).join(" ")).toContain("slot");
    },
  );
});
