import { normalizeStoreDomain } from "../url";
import { parseGid } from "../utils/parse-gid";

const DEFAULT_SOURCE = "hydrogen";
const DEFAULT_ACCESSIBILITY_LABEL = "Buy with Shop Pay";
const ERROR_PREFIX = "[hydrogen:error:ShopPay]";
const CAN_USE_DOM = typeof document !== "undefined";
export const SHOP_PAY_BUTTON_TAG_NAME = "hydrogen-shop-pay-button";
export const SHOP_PAY_BUTTON_CLASS_NAME = "shop-pay-button";
const SHOP_PAY_BUTTON_OBSERVED_ATTRIBUTES = [
  "accessibility-label",
  "border-radius",
  "channel",
  "checkout-url",
  "disabled",
  "nonce",
  "payment-option",
  "source",
  "source-token",
  "variants",
  "width",
] as const;

/** Button styles matching the hosted shop-js pay button. */
export const SHOP_PAY_BUTTON_STYLES =
  `:host{display:block}` +
  `.${SHOP_PAY_BUTTON_CLASS_NAME}{position:relative;display:flex;align-items:center;box-sizing:border-box;margin:0;padding:10px 16px;overflow:visible;width:260px;border:none;border-radius:12px;background-color:#5433eb;color:#fff;cursor:pointer;text-decoration:none;transition:all .15s cubic-bezier(.4,0,.2,1)}` +
  `.${SHOP_PAY_BUTTON_CLASS_NAME}:hover{background-color:#4524db}` +
  `.${SHOP_PAY_BUTTON_CLASS_NAME}:focus-visible{outline:none;box-shadow:0 0 0 3px #9c83f8}` +
  `.${SHOP_PAY_BUTTON_CLASS_NAME}[aria-disabled=true]{opacity:.5;pointer-events:none;cursor:default}` +
  `.${SHOP_PAY_BUTTON_CLASS_NAME}__logo{position:relative;display:inline-block;margin:0 auto;width:88px;height:auto}`;

const SHOP_PAY_LOGO_SVG =
  `<svg class="${SHOP_PAY_BUTTON_CLASS_NAME}__logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 25" aria-hidden="true" focusable="false">` +
  '<path fill="currentColor" d="M70.842 7.915h2.25c1.561 0 2.328.642 2.328 1.715 0 1.074-.739 1.715-2.259 1.715h-2.32v-3.43ZM80.525 16.142c-.879 0-1.227-.474-1.227-.948 0-.642.725-.935 2.147-1.102l1.115-.125c-.07 1.227-.892 2.175-2.035 2.175Z"/>' +
  '<path fill="currentColor" fill-rule="evenodd" d="M65.645.5a3.64 3.64 0 0 0-3.64 3.64V20.7a3.64 3.64 0 0 0 3.64 3.64h29.668a3.64 3.64 0 0 0 3.64-3.64V4.14A3.64 3.64 0 0 0 95.314.5H65.645Zm5.197 16.674v-4.197h2.64c2.412 0 3.695-1.353 3.695-3.402 0-2.05-1.283-3.277-3.695-3.277h-4.341v10.876h1.7Zm9.334.223c1.297 0 2.147-.572 2.538-1.548.112 1.088.767 1.645 2.189 1.269l.014-1.157c-.572.055-.683-.154-.683-.753v-2.845c0-1.673-1.102-2.663-3.138-2.663-2.008 0-3.165 1.004-3.165 2.705h1.562c0-.809.572-1.297 1.576-1.297 1.06 0 1.547.46 1.534 1.255v.363l-1.8.195c-2.021.223-3.137.99-3.137 2.329 0 1.101.781 2.147 2.51 2.147Zm9.906.32c-.711 1.73-1.855 2.245-3.64 2.245h-.766V18.54h.822c.977 0 1.45-.307 1.966-1.185L85.3 9.923h1.757l2.259 5.424 2.008-5.424h1.715l-2.956 7.795Z" clip-rule="evenodd"/>' +
  '<path fill="currentColor" d="M6.992 11.055c-2.359-.509-3.41-.708-3.41-1.612 0-.85.711-1.274 2.134-1.274 1.25 0 2.165.544 2.839 1.61.05.081.155.11.241.066l2.655-1.335a.186.186 0 0 0 .076-.259c-1.102-1.9-3.137-2.94-5.818-2.94C2.188 5.311 0 7.037 0 9.781c0 2.915 2.664 3.651 5.027 4.16 2.362.51 3.417.709 3.417 1.613s-.769 1.33-2.303 1.33c-1.416 0-2.467-.644-3.102-1.896a.186.186 0 0 0-.251-.082L.14 16.21a.188.188 0 0 0-.083.253c1.051 2.102 3.207 3.285 6.087 3.285 3.668 0 5.885-1.698 5.885-4.527 0-2.83-2.677-3.651-5.037-4.16v-.007ZM21.218 5.311c-1.505 0-2.835.531-3.791 1.477-.06.057-.159.015-.159-.067V.687A.185.185 0 0 0 17.081.5h-3.322a.185.185 0 0 0-.187.187v18.73c0 .104.083.186.187.186h3.322a.185.185 0 0 0 .187-.186V11.2c0-1.587 1.223-2.804 2.87-2.804 1.649 0 2.843 1.191 2.843 2.804v8.216c0 .104.082.186.187.186h3.322a.185.185 0 0 0 .187-.186V11.2c0-3.452-2.274-5.89-5.459-5.89ZM33.415 4.774c-1.803 0-3.493.55-4.706 1.343a.186.186 0 0 0-.06.25l1.464 2.488c.054.089.168.12.257.066a5.853 5.853 0 0 1 3.052-.834c2.899 0 5.03 2.036 5.03 4.726 0 2.292-1.706 3.99-3.868 3.99-1.762 0-2.985-1.022-2.985-2.463 0-.825.352-1.502 1.27-1.98a.183.183 0 0 0 .073-.258l-1.381-2.327a.187.187 0 0 0-.226-.079c-1.85.683-3.15 2.327-3.15 4.533 0 3.338 2.67 5.83 6.396 5.83 4.35 0 7.478-3 7.478-7.303 0-4.612-3.64-7.982-8.644-7.982ZM51.776 5.283c-1.68 0-3.182.62-4.277 1.707a.093.093 0 0 1-.16-.066v-1.31a.185.185 0 0 0-.187-.186h-3.235a.185.185 0 0 0-.188.187v18.702c0 .104.083.186.188.186h3.32a.185.185 0 0 0 .188-.186v-6.133c0-.082.099-.123.16-.07 1.091 1.012 2.536 1.603 4.19 1.603 3.897 0 6.936-3.139 6.936-7.217 0-4.078-3.042-7.217-6.935-7.217Zm-.63 11.266c-2.215 0-3.895-1.754-3.895-4.074S48.928 8.4 51.147 8.4c2.22 0 3.893 1.726 3.893 4.075 0 2.348-1.651 4.074-3.896 4.074h.003Z"/>' +
  "</svg>";

type ShopPayButtonBaseOptions = {
  /**
   * Absolute checkout base URL. Omit it to emit same-origin `/checkout` and
   * `/cart` permalink paths, which `handleShopifyRoutes` redirects to the
   * store's real checkout.
   */
  checkoutUrl?: string;
  /**
   * Checkout payment mode. Defaults to `"shop_pay"`. Use
   * `"shop_pay_installments"` only when the checkout path should open Shop Pay
   * Installments.
   */
  paymentOption?: "shop_pay" | "shop_pay_installments";
  /**
   * Attribution source appended to the checkout URL as `source`. Defaults to
   * `"hydrogen"`. Most storefronts should not override this.
   */
  source?: string;
  /**
   * Optional attribution token appended to the checkout URL as `source_token`.
   * Only pass a value when Shopify has provided one for the integration.
   */
  sourceToken?: string;
  /**
   * Content Security Policy nonce applied to the shadow root's inline style.
   */
  nonce?: string;
  /**
   * Sales channel that issued the Storefront API token. Omit it unless checkout
   * needs explicit `"headless"` or `"hydrogen"` attribution.
   */
  channel?: "headless" | "hydrogen";
  /**
   * Disables the button. Disabled buttons render without an `href` and include
   * `aria-disabled="true"`.
   */
  disabled?: boolean;
  /**
   * CSS width for the rendered anchor, for example `"100%"`. Omit it to use
   * the Shop Pay default width.
   */
  width?: string;
  /**
   * CSS border radius for the rendered anchor, for example `"8px"`. Omit it to
   * use the Shop Pay default radius.
   */
  borderRadius?: string;
  /**
   * Localized accessible label for the Shop Pay logo. Defaults to `"Buy with Shop Pay"`.
   * Never translate the brand name `"Shop Pay"`; keep it in Latin script in every locale.
   *
   * @example English
   * `"Buy with Shop Pay"`
   *
   * @example Japanese
   * `"Shop Payで購入"`
   *
   * @example Hindi
   * `"Shop Pay से खरीदें"`
   *
   * @example Arabic
   * `"الشراء باستخدام Shop Pay"`
   */
  accessibilityLabel?: string;
};

type ShopPayVariantWithQuantity = {
  /** ProductVariant GID or bare numeric ProductVariant ID. Product IDs are invalid. */
  id: string;
  /** Quantity for this variant. Defaults to `1`. */
  quantity?: number;
};

type ShopPayVariant = string | ShopPayVariantWithQuantity;
type ShopPayVariants = readonly string[] | readonly ShopPayVariantWithQuantity[];

export type ShopPayButtonOptions = ShopPayButtonBaseOptions & {
  /**
   * Variants to check out immediately via a Shopify cart permalink. Omit this
   * for cart checkout mode, where `/checkout` checks out the current cart.
   */
  variants?: ShopPayVariants;
};

/**
 * Builds the checkout URL the Shop Pay button navigates to, or `null` when the
 * button is disabled. Variant mode produces a cart permalink; otherwise the
 * current cart checks out.
 */
export function getShopPayButtonUrl(options: ShopPayButtonOptions): string | null {
  if (options.disabled) return null;

  const variants = getShopPayVariants(options);

  if (!options.checkoutUrl) {
    const search = getShopPaySearchParams(options);
    return `${variants ? `/cart/${variants}` : "/checkout"}?${search}`;
  }

  const url = variants
    ? getShopPayVariantModeUrl(options.checkoutUrl, variants)
    : getShopPayCheckoutModeUrl(options.checkoutUrl);

  for (const [name, value] of getShopPaySearchParams(options)) {
    url.searchParams.set(name, value);
  }

  return url.toString();
}

/**
 * Renders the Shop Pay button as an HTML string: a self-contained wrapper
 * element carrying the styles and anchor it needs to work without client
 * JavaScript. Use it from server templates or frameworks without a Hydrogen
 * binding.
 */
export function renderShopPayButton(options: ShopPayButtonOptions): string {
  defineShopPayButton();
  const attributes = serializeAttributes(getShopPayButtonElementAttributes(options));
  const content = CAN_USE_DOM ? "" : getShopPayButtonDeclarativeShadowDomHtml(options);
  return `<${SHOP_PAY_BUTTON_TAG_NAME}${attributes ? ` ${attributes}` : ""}>${content}</${SHOP_PAY_BUTTON_TAG_NAME}>`;
}

/**
 * Creates the Shop Pay button as a detached DOM element. The returned element
 * carries the button styles with it.
 */
export function createShopPayButton(options: ShopPayButtonOptions): HTMLElement {
  defineShopPayButton();
  const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
  initializeShopPayButtonElement(element, options);

  return element;
}

export function initializeShopPayButtonElement(
  element: HTMLElement,
  options: ShopPayButtonOptions,
): void {
  syncShopPayButtonElementAttributes(element, getShopPayButtonElementAttributes(options));

  const shadowRoot = element.shadowRoot ?? element.attachShadow({ mode: "open" });
  const template = element.querySelector("template[shadowrootmode]");

  if (template instanceof HTMLTemplateElement) {
    shadowRoot.append(template.content.cloneNode(true));
    template.remove();
  }

  renderShopPayButtonShadowRoot(shadowRoot, options);
}

/** Registers the Shop Pay custom element. No-ops during SSR or when already registered. */
export function defineShopPayButton(): void {
  if (
    typeof customElements === "undefined" ||
    typeof HTMLElement === "undefined" ||
    customElements.get(SHOP_PAY_BUTTON_TAG_NAME)
  ) {
    return;
  }

  customElements.define(
    SHOP_PAY_BUTTON_TAG_NAME,
    class extends HTMLElement {
      #connected = false;

      static observedAttributes = SHOP_PAY_BUTTON_OBSERVED_ATTRIBUTES;

      connectedCallback(): void {
        this.#connected = true;
        initializeShopPayButtonElement(this, getShopPayButtonOptions(this));
      }

      attributeChangedCallback(): void {
        if (!this.#connected || !this.shadowRoot) return;
        renderShopPayButtonShadowRoot(this.shadowRoot, getShopPayButtonOptions(this));
      }
    },
  );
}

/** Anchor attributes shared by server and browser shadow-root rendering. */
export function getShopPayButtonAnchorAttributes(
  options: ShopPayButtonOptions,
): Record<string, string> {
  const attributes: Record<string, string> = { class: SHOP_PAY_BUTTON_CLASS_NAME };

  const href = getShopPayButtonUrl(options);
  if (href) {
    attributes.href = href;
  } else {
    attributes.role = "link";
    attributes["aria-disabled"] = "true";
  }

  const style = serializeStyleProperties(getShopPayButtonStyleProperties(options));
  if (style) attributes.style = style;

  attributes["aria-label"] = getShopPayAccessibilityLabel(options.accessibilityLabel);

  return attributes;
}

export function getShopPayButtonElementContentHtml(options: ShopPayButtonOptions): string {
  return `<style${getShopPayButtonStyleNonceAttribute(options)}>${SHOP_PAY_BUTTON_STYLES}</style><a ${serializeAttributes(getShopPayButtonAnchorAttributes(options))}>${getShopPayButtonContentHtml()}</a>`;
}

/** Declarative shadow DOM content for framework bindings that render the host separately. */
export function getShopPayButtonDeclarativeShadowDomHtml(options: ShopPayButtonOptions): string {
  return `<template shadowrootmode="open" shadowroot="open">${getShopPayButtonElementContentHtml(options)}</template>`;
}

/** Host attributes for framework bindings that render the Shop Pay custom element. */
export function getShopPayButtonElementAttributes(
  options: ShopPayButtonOptions,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const variants = getShopPayVariants(options);

  if (hasContent(options.accessibilityLabel)) {
    attributes["accessibility-label"] = options.accessibilityLabel.trim();
  }
  if (hasContent(options.borderRadius)) {
    attributes["border-radius"] = normalizeCssValue("borderRadius", options.borderRadius);
  }
  if (options.channel) attributes.channel = options.channel;
  if (options.checkoutUrl !== undefined) attributes["checkout-url"] = options.checkoutUrl;
  if (options.disabled) attributes.disabled = "";
  if (hasContent(options.nonce)) attributes.nonce = options.nonce.trim();
  if (options.paymentOption) attributes["payment-option"] = options.paymentOption;
  if (options.source !== undefined) attributes.source = options.source;
  if (options.sourceToken !== undefined) attributes["source-token"] = options.sourceToken;
  if (variants) attributes.variants = variants;
  if (hasContent(options.width)) {
    attributes.width = normalizeCssValue("width", options.width);
  }

  return attributes;
}

/** Inner HTML for the shadow root's anchor. */
export function getShopPayButtonContentHtml(): string {
  return SHOP_PAY_LOGO_SVG;
}

function getShopPayButtonStyleProperties(
  options: Pick<ShopPayButtonOptions, "width" | "borderRadius">,
): Record<string, string> {
  const style: Record<string, string> = {};

  if (hasContent(options.width)) style.width = normalizeCssValue("width", options.width);
  if (hasContent(options.borderRadius)) {
    style.borderRadius = normalizeCssValue("borderRadius", options.borderRadius);
  }

  return style;
}

function getShopPaySearchParams(options: ShopPayButtonOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set("payment", options.paymentOption ?? "shop_pay");

  const source = options.source ?? DEFAULT_SOURCE;
  if (source) params.set("source", source);
  if (options.sourceToken) params.set("source_token", options.sourceToken);
  if (options.channel) params.set("channel", options.channel);

  return params;
}

function getShopPayCheckoutModeUrl(checkoutUrl: string): URL {
  const url = parseCheckoutUrl(checkoutUrl);
  if (url.pathname === "/") url.pathname = "/checkout";
  url.hash = "";
  return url;
}

function getShopPayVariantModeUrl(checkoutUrl: string, variants: string): URL {
  const url = parseCheckoutUrl(checkoutUrl);
  url.pathname = `/cart/${variants}`;
  url.hash = "";
  return url;
}

function parseCheckoutUrl(checkoutUrl: string): URL {
  try {
    return new URL(normalizeStoreDomain(checkoutUrl.trim()));
  } catch {
    throw shopPayError('Shop Pay requires a valid "checkoutUrl" value.');
  }
}

function getShopPayVariants(options: ShopPayButtonOptions): string | undefined {
  const variantsInput: readonly ShopPayVariant[] | undefined = options.variants;

  if (!Array.isArray(variantsInput) || variantsInput.length === 0) return undefined;

  if (variantsInput.every(isVariantId)) {
    return variantsInput.map((id) => `${normalizeVariantId(id)}:1`).join(",");
  }

  if (variantsInput.every(isVariantWithQuantity)) {
    return variantsInput
      .map(({ id, quantity }) => {
        return `${normalizeVariantId(id)}:${normalizeQuantity(quantity)}`;
      })
      .join(",");
  }

  throw shopPayError(
    "Shop Pay variants must be either variant IDs or objects with an id and quantity.",
  );
}

function isVariantId(variant: ShopPayVariant): variant is string {
  return typeof variant === "string";
}

function getShopPayButtonOptions(element: HTMLElement): ShopPayButtonOptions {
  return {
    accessibilityLabel: element.getAttribute("accessibility-label") ?? undefined,
    borderRadius: element.getAttribute("border-radius") ?? undefined,
    channel: parseChannel(element.getAttribute("channel")),
    checkoutUrl: element.getAttribute("checkout-url") ?? undefined,
    disabled: element.hasAttribute("disabled"),
    nonce: element.nonce || element.getAttribute("nonce") || undefined,
    paymentOption: parsePaymentOption(element.getAttribute("payment-option")),
    source: element.getAttribute("source") ?? undefined,
    sourceToken: element.getAttribute("source-token") ?? undefined,
    variants: parseVariantsAttribute(element.getAttribute("variants")),
    width: element.getAttribute("width") ?? undefined,
  };
}

function parseVariantsAttribute(value: string | null): ShopPayVariants | undefined {
  if (!value) return undefined;

  return value.split(",").map((entry) => {
    const [id = "", quantity] = entry.split(":");
    return { id, quantity: quantity === undefined ? undefined : Number(quantity) };
  });
}

function parsePaymentOption(value: string | null): ShopPayButtonOptions["paymentOption"] {
  return value === "shop_pay" || value === "shop_pay_installments" ? value : undefined;
}

function parseChannel(value: string | null): ShopPayButtonOptions["channel"] {
  return value === "headless" || value === "hydrogen" ? value : undefined;
}

function renderShopPayButtonShadowRoot(
  shadowRoot: ShadowRoot,
  options: ShopPayButtonOptions,
): void {
  let style = shadowRoot.querySelector("style");
  if (!(style instanceof HTMLStyleElement)) {
    style = shadowRoot.ownerDocument.createElement("style");
    shadowRoot.prepend(style);
  }

  const nextNonce = hasContent(options.nonce) ? options.nonce.trim() : undefined;
  const nonceChanged = (style.nonce || undefined) !== nextNonce;
  if (nextNonce) {
    style.nonce = nextNonce;
  } else {
    style.removeAttribute("nonce");
  }
  if (nonceChanged) style.textContent = "";
  if (style.textContent !== SHOP_PAY_BUTTON_STYLES) style.textContent = SHOP_PAY_BUTTON_STYLES;

  let anchor = shadowRoot.querySelector("a");
  if (!(anchor instanceof HTMLAnchorElement)) {
    anchor = shadowRoot.ownerDocument.createElement("a");
    shadowRoot.append(anchor);
  }

  syncAttributes(anchor, getShopPayButtonAnchorAttributes(options));
  const content = getShopPayButtonContentHtml();
  if (anchor.innerHTML !== content) anchor.innerHTML = content;
}

function syncAttributes(element: Element, attributes: Record<string, string>): void {
  for (const name of element.getAttributeNames()) {
    if (!(name in attributes)) element.removeAttribute(name);
  }

  for (const [name, value] of Object.entries(attributes)) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
}

function syncShopPayButtonElementAttributes(
  element: Element,
  attributes: Record<string, string>,
): void {
  for (const name of SHOP_PAY_BUTTON_OBSERVED_ATTRIBUTES) {
    if (!(name in attributes)) element.removeAttribute(name);
  }

  for (const [name, value] of Object.entries(attributes)) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
}

function isVariantWithQuantity(
  variant: ShopPayVariant | undefined,
): variant is ShopPayVariantWithQuantity {
  return typeof variant === "object" && variant !== null && typeof variant.id === "string";
}

function normalizeVariantId(id: string): string {
  const parsed = parseGid(id);
  const bareId = parsed.id || id.trim();

  if (parsed.resource && parsed.resource !== "ProductVariant") {
    throw shopPayError(
      "Shop Pay variant IDs must be Shopify ProductVariant GIDs or bare numeric variant IDs.",
    );
  }

  if (/^\d+$/.test(bareId)) return bareId;

  throw shopPayError(
    "Shop Pay variant IDs must be Shopify ProductVariant GIDs or bare numeric variant IDs.",
  );
}

function normalizeQuantity(quantity = 1): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw shopPayError("Shop Pay variant quantities must be positive integers.");
  }

  return quantity;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function getShopPayAccessibilityLabel(label: string | undefined): string {
  return hasContent(label) ? label.trim() : DEFAULT_ACCESSIBILITY_LABEL;
}

function getShopPayButtonStyleNonceAttribute(options: Pick<ShopPayButtonOptions, "nonce">): string {
  return hasContent(options.nonce) ? ` nonce="${escapeAttribute(options.nonce.trim())}"` : "";
}

function hasContent(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeCssValue(name: "width" | "borderRadius", value: string): string {
  const normalized = value.trim();
  if (/[;{}]/.test(normalized)) {
    throw shopPayError(`Shop Pay ${name} must be a single CSS value.`);
  }
  return normalized;
}

function serializeAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
}

function serializeStyleProperties(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([name, value]) => `${hyphenateStyleName(name)}:${value}`)
    .join(";");
}

function hyphenateStyleName(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function shopPayError(message: string): Error {
  return new Error(`${ERROR_PREFIX} ${message}`);
}
