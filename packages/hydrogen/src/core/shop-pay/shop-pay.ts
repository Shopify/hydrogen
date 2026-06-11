import { normalizeStoreDomain } from "../url";
import { loadScript } from "../utils/load-script";
import { parseGid } from "../utils/parse-gid";

const SHOP_JS_URL =
  "https://cdn.shopify.com/shopifycloud/shop-js/modules/v2/loader.pay-button.esm.js";
const DEFAULT_SOURCE = "hydrogen";
const ERROR_PREFIX = "[hydrogen:error:ShopPay]";
export const SHOP_PAY_BUTTON_TAG_NAME = "shop-pay-button";

type ShopPayButtonBaseOptions = {
  checkoutUrl?: string;
  paymentOption?: "shop_pay" | "shop_pay_installments";
  source?: string;
  sourceToken?: string;
  channel?: "headless" | "hydrogen";
  disabled?: boolean;
  width?: string;
  height?: string;
  borderRadius?: string;
};

type ShopPayVariantWithQuantity = {
  id: string;
  quantity?: number;
};

type ShopPayVariant = string | ShopPayVariantWithQuantity;
type ShopPayVariants = readonly string[] | readonly ShopPayVariantWithQuantity[];

export type ShopPayButtonOptions = ShopPayButtonBaseOptions & {
  variants?: ShopPayVariants;
};

export function loadShopJs(): Promise<void> {
  return loadScript(SHOP_JS_URL, { module: true }).then(() => {});
}

export function createShopPayButton(options: ShopPayButtonOptions): HTMLElement {
  const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
  const attributes = getShopPayButtonAttributes(options);
  const style = getShopPayButtonStyleProperties(options);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  for (const [name, value] of Object.entries(style)) {
    element.style.setProperty(name, value);
  }

  return element;
}

export function handleShopPayCheckoutClick(
  event: Pick<Event, "preventDefault" | "stopPropagation">,
  options: ShopPayButtonOptions,
): void {
  if (__DEV__) {
    const url = getShopPayButtonDevUrl(options);
    if (!url) return;

    event.preventDefault();
    event.stopPropagation();
    window.location.href = url;
  }
}

export function getShopPayButtonUrl(options: ShopPayButtonOptions): string | null {
  if (!options.checkoutUrl || options.disabled) return null;

  const variants = getShopPayVariants(options, "cart-path");
  const url = variants
    ? getShopPayVariantModeUrl(options.checkoutUrl, variants)
    : getShopPayCheckoutModeUrl(options.checkoutUrl);

  url.searchParams.set("payment", options.paymentOption ?? "shop_pay");

  const source = options.source ?? DEFAULT_SOURCE;
  if (source) url.searchParams.set("source", source);
  if (options.sourceToken) url.searchParams.set("source_token", options.sourceToken);
  if (options.channel) url.searchParams.set("channel", options.channel);

  return url.toString();
}

/**
 * Dev-only utility to mimic what shop-pay button does internally but supporting localhost.
 * The custom element removes the localhost port and forces https.
 */
export function getShopPayButtonDevUrl(options: ShopPayButtonOptions): string | null {
  if (typeof window === "undefined" || options.disabled) return null;

  const variants = getShopPayVariants(options, "cart-path");
  const url = new URL(variants ? `/cart/${variants}` : "/checkout", window.location.origin);

  url.searchParams.set("payment", options.paymentOption ?? "shop_pay");

  const source = options.source ?? DEFAULT_SOURCE;
  if (source) url.searchParams.set("source", source);
  if (options.sourceToken) url.searchParams.set("source_token", options.sourceToken);
  if (options.channel) url.searchParams.set("channel", options.channel);

  return url.toString();
}

export function getShopPayButtonAttributes(options: ShopPayButtonOptions): Record<string, string> {
  const variants = getShopPayVariants(options, "attribute");

  const attributes: Record<string, string> = {};

  if (options.checkoutUrl) attributes["store-url"] = normalizeCheckoutUrl(options.checkoutUrl);
  if (variants) attributes.variants = variants;
  attributes.source = options.source ?? DEFAULT_SOURCE;
  if (options.paymentOption) attributes["payment-option"] = options.paymentOption;
  if (options.sourceToken) attributes["source-token"] = options.sourceToken;
  if (options.channel) attributes.channel = options.channel;
  if (options.disabled) attributes.disabled = "";

  return attributes;
}

export function getShopPayButtonStyleProperties(
  options: Pick<ShopPayButtonOptions, "width" | "height" | "borderRadius">,
): Record<string, string> {
  const style: Record<string, string> = {};

  if (options.width) style["--shop-pay-button-width"] = options.width;
  if (options.height) style["--shop-pay-button-height"] = options.height;
  if (options.borderRadius) {
    style["--shop-pay-button-border-radius"] = options.borderRadius;
  }

  return style;
}

function normalizeCheckoutUrl(checkoutUrl: string): string {
  try {
    return new URL(normalizeStoreDomain(checkoutUrl.trim())).origin;
  } catch {
    throw shopPayError('Shop Pay requires a valid "checkoutUrl" value.');
  }
}

function getShopPayCheckoutModeUrl(checkoutUrl: string): URL {
  const url = new URL(normalizeStoreDomain(checkoutUrl.trim()));
  if (url.pathname === "/") url.pathname = "/checkout";
  url.hash = "";
  return url;
}

function getShopPayVariantModeUrl(checkoutUrl: string, variants: string): URL {
  const url = new URL(normalizeStoreDomain(checkoutUrl.trim()));
  url.pathname = `/cart/${variants}`;
  url.hash = "";
  return url;
}

function getShopPayVariants(
  options: ShopPayButtonOptions,
  mode: "attribute" | "cart-path",
): string | undefined {
  const variantsInput = options.variants as readonly ShopPayVariant[] | undefined;

  if (!Array.isArray(variantsInput) || variantsInput.length === 0) return undefined;

  const firstVariant = variantsInput[0];

  if (typeof firstVariant === "string") {
    if (!variantsInput.every((variant) => typeof variant === "string")) {
      throw shopPayError(
        "Shop Pay variants must be either variant IDs or objects with an id and quantity.",
      );
    }

    const variantIds = variantsInput as readonly string[];
    return variantIds
      .map((id) => {
        const normalizedId = normalizeVariantId(id);
        return mode === "cart-path" ? `${normalizedId}:1` : normalizedId;
      })
      .join(",");
  }

  if (isVariantWithQuantity(firstVariant)) {
    if (!variantsInput.every(isVariantWithQuantity)) {
      throw shopPayError(
        "Shop Pay variants must be either variant IDs or objects with an id and quantity.",
      );
    }

    const variantsWithQuantities = variantsInput as readonly ShopPayVariantWithQuantity[];
    return variantsWithQuantities
      .map(({ id, quantity }) => {
        return `${normalizeVariantId(id)}:${normalizeQuantity(quantity)}`;
      })
      .join(",");
  }

  throw shopPayError(
    "Shop Pay variants must be either variant IDs or objects with an id and quantity.",
  );
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

function shopPayError(message: string): Error {
  return new Error(`${ERROR_PREFIX} ${message}`);
}
