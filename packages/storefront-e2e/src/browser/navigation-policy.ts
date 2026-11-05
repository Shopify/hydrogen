export type BlockReason = "invalid-url" | "scheme" | "checkout" | "customer-account";

/**
 * A description of a blocked checkout URL for private owner diagnostics.
 * Query values and the fragment are omitted.
 */
export type CheckoutRouteShape = {
  scheme: string;
  /** Scheme, host, and port. Hosts stay identifiable in reports. */
  origin: string;
  /** The URL pathname, unchanged. */
  route: string;
  /** Query parameter names only, sorted and unique. */
  queryNames: string[];
};

/**
 * A blocked checkout document. `checkout.url` is the raw URL for private owner reports.
 * No cart reference is read from it. The session cart is read through the page's cart JSON
 * endpoint when available, never from a blocked checkout page.
 */
export type CheckoutBlock = {
  action: "block";
  reason: "checkout";
  route: CheckoutRouteShape;
  checkout: { url: string };
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
 * checked again, so the checkout destination is still blocked. Blocking does not read a cart.
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
  return {
    action: "block",
    reason: "checkout",
    route: describeCheckoutRoute(url),
    checkout: { url: url.href },
  };
}

/** Describes a checkout URL without query values or the fragment. */
export function describeCheckoutRoute(url: URL): CheckoutRouteShape {
  return {
    scheme: url.protocol.slice(0, -1),
    origin: url.origin,
    route: url.pathname,
    queryNames: [...new Set(url.searchParams.keys())].toSorted(),
  };
}
