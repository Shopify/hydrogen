import {
  isPublicQueryName,
  parseCheckoutEvidence,
  publicSegmentLabel,
  type CheckoutForm,
} from "../shopify/checkout.ts";

export type BlockReason = "invalid-url" | "scheme" | "checkout" | "customer-account";

/**
 * A secret-safe description of a blocked checkout URL, for diagnostics on disk. It never holds
 * the raw URL, path tokens, or query values.
 */
export type CheckoutRouteShape = {
  scheme: string;
  /** Scheme, host, and port. Hosts stay identifiable in reports. */
  origin: string;
  /** The path with every private segment masked, such as `/checkouts/cn/:segment/:locale`. */
  route: string;
  /** Query parameter names only, sorted and unique. Private names are masked as `:param`. */
  queryNames: string[];
  /**
   * Whether the URL has a cart reference the Storefront API can read, and its route form. Only
   * fixed parser messages are kept.
   */
  cart: { readable: true; form: CheckoutForm } | { readable: false; problem: string };
};

/**
 * A blocked checkout document. `checkout` always holds the URL (memory only) and, when the URL
 * has a readable cart reference, the cart ID to read. A capture is never dropped because no
 * cart ID can be read.
 */
export type CheckoutBlock = {
  action: "block";
  reason: "checkout";
  route: CheckoutRouteShape;
  checkout: { url: string; cartId?: string };
};

export type NavigationDecision =
  | { action: "continue" }
  | { action: "block"; reason: Exclude<BlockReason, "checkout"> }
  | CheckoutBlock;

const LOCALE = String.raw`(?:\/[a-z]{2}(?:-[a-z]{2})?)?`;
const CHECKOUT_PATH = new RegExp(
  String.raw`^${LOCALE}\/(?:cart\/c\/|cart\/\d+:\d+|checkouts?(?:\/|$))`,
  "i",
);
/** The storefront's own `/checkout` route. It only redirects to the Shopify checkout URL. */
const STOREFRONT_CHECKOUT_ROUTE = new RegExp(String.raw`^${LOCALE}\/checkout\/?$`, "i");
const ACCOUNT_PATH =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/(?:account|authentication)(?:\/|$)|^\/\d+\/account(?:\/|$)/i;
const CHECKOUT_HOSTS = new Set(["checkout.shopify.com", "pay.shopify.com"]);
const ACCOUNT_HOSTS = new Set(["shop.app", "accounts.shopify.com"]);

/**
 * Decides whether the browser may load a document (top-level page, popup, or frame).
 * Every checkout-looking URL is blocked on any host before it is sent, except the exact
 * same-origin storefront `/checkout` route, so its redirect can run. Each redirect hop is
 * checked again, so the checkout destination is still blocked. Blocking does not depend on
 * reading a cart: every checkout block carries the URL, and a cart ID only when the URL has a
 * readable reference (see `readCheckoutReference`). Both are an unverified candidate.
 */
export function classifyDocumentRequest(rawUrl: string, baseUrl: string): NavigationDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { action: "block", reason: "invalid-url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { action: "block", reason: "scheme" };
  }
  const storefrontRoute =
    url.origin === new URL(baseUrl).origin && STOREFRONT_CHECKOUT_ROUTE.test(url.pathname);
  if (!storefrontRoute && (CHECKOUT_HOSTS.has(url.hostname) || CHECKOUT_PATH.test(url.pathname))) {
    return checkoutBlock(url);
  }
  if (
    ACCOUNT_HOSTS.has(url.hostname) ||
    url.hostname.startsWith("account.") ||
    ACCOUNT_PATH.test(url.pathname)
  ) {
    return { action: "block", reason: "customer-account" };
  }
  return { action: "continue" };
}

function checkoutBlock(url: URL): CheckoutBlock {
  const parsed = parseCheckoutEvidence({ url: url.href });
  if (!parsed.ok) {
    const cart = { readable: false, problem: parsed.reason } satisfies CheckoutRouteShape["cart"];
    return {
      action: "block",
      reason: "checkout",
      route: describeCheckoutRoute(url, cart),
      checkout: { url: url.href },
    };
  }
  const { reference, cartId } = parsed.checkout;
  const cart: CheckoutRouteShape["cart"] = reference.found
    ? { readable: true, form: reference.form }
    : { readable: false, problem: reference.problem };
  return {
    action: "block",
    reason: "checkout",
    route: describeCheckoutRoute(url, cart),
    checkout: cartId === undefined ? { url: url.href } : { url: url.href, cartId },
  };
}

/**
 * Describes a checkout URL without secrets: public path labels (route words, `:locale`,
 * `:variant-quantities`, `:number`), `:segment` for every private segment, and public query
 * parameter names (`:param` for the others). Query values and the fragment are dropped.
 */
export function describeCheckoutRoute(
  url: URL,
  cart: CheckoutRouteShape["cart"],
): CheckoutRouteShape {
  const route = url.pathname
    .split("/")
    .slice(1)
    .map((segment) => (segment === "" ? "" : (publicSegmentLabel(segment) ?? ":segment")));
  const names = [...new Set(url.searchParams.keys())].map((name) =>
    isPublicQueryName(name) ? name : ":param",
  );
  return {
    scheme: url.protocol.slice(0, -1),
    origin: url.origin,
    route: `/${route.join("/")}`,
    queryNames: [...new Set(names)].toSorted(),
    cart,
  };
}
