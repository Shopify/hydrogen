import type { Page } from "playwright-core";

import type { CartLine, CartSnapshot } from "../scenario.ts";
import { CartReadError, type CartReadErrorCode } from "./cart-error.ts";

export const CART_READ_TIMEOUT_MS = 5_000;
/** A bound on cart lines read from one response. More is an invalid response, not a cart. */
const MAX_CART_ITEMS = 500;
/** Extra time for the page evaluation itself, after the page-side request deadline. */
const EVALUATE_GRACE_MS = 1_000;
const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";

/** Primitive business fields copied out of the page. Nothing else leaves the page. */
type RawItem = { variantId: unknown; quantity: unknown };
type PageResult =
  | { status: "ok"; endpoint: string; items: RawItem[]; itemCount: unknown }
  | { status: "page-unavailable" | "unsupported-root" | "redirect-refused" }
  | { status: "network" | "timeout" | "invalid-json" | "invalid-response" }
  | { status: "http-status"; httpStatus: number };

/**
 * Reads the active cart of the current browser session with one `GET <root>cart.js`, the
 * documented Shopify AJAX cart endpoint (Hydrogen rewrites it to `cart.json`). The request runs
 * in the page, so the browser sends the session cookies itself: this reader reads, parses, and
 * sets no cookie, and needs no cart ID.
 *
 * The root is `window.Shopify.routes.root` when the page sets it (it must be a same-origin
 * http(s) path, or the read is refused), else the path of `storefrontUrl` (the supplied base
 * path, not the current page path), on the current page origin. Redirects are refused, the
 * response is not cached, and the read is bounded by `timeoutMs`, body included.
 *
 * Only `items[].variant_id`, `items[].quantity`, and `item_count` are read. Tokens, notes,
 * attributes, and line properties never leave the page. An abort rejects with the abort reason.
 * Every other problem rejects with a {@link CartReadError} with a fixed message.
 */
export async function readCart(
  page: Page,
  storefrontUrl: URL,
  signal: AbortSignal,
  timeoutMs = CART_READ_TIMEOUT_MS,
): Promise<CartSnapshot> {
  signal.throwIfAborted();
  const read = (async (): Promise<PageResult> => {
    const url = await page.evaluate(cartUrlInPage, storefrontUrl.pathname);
    if (url === "page-unavailable" || url === "unsupported-root") return { status: url };
    return page.evaluate(fetchCartInPage, {
      url,
      limitMs: Math.max(1, timeoutMs),
      maxItems: MAX_CART_ITEMS,
    });
  })();
  read.catch(() => undefined);

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  aborted.catch(() => undefined);
  // A page that never answers the evaluation is bounded here too, not only by the page timer.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<PageResult>((resolve) => {
    timer = setTimeout(() => resolve({ status: "timeout" }), timeoutMs + EVALUATE_GRACE_MS);
  });
  let result: PageResult;
  try {
    result = await Promise.race([read, aborted, late]);
  } catch {
    signal.throwIfAborted();
    throw new CartReadError("unreadable", "The cart JSON could not be read from the page.");
  } finally {
    clearTimeout(timer);
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
  return snapshot(result, timeoutMs);
}

/**
 * Runs in the page: the cart JSON URL on the current origin, under `window.Shopify.routes.root`
 * when the page sets one, else under `basePath`.
 */
function cartUrlInPage(basePath: string): string {
  if (!/^https?:$/.test(location.protocol)) return "page-unavailable";
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- page.evaluate sends only this function to the page, so its helpers must be defined inside it.
  const field = (value: unknown, name: string): unknown =>
    typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined;
  const root = field(field(Reflect.get(window, "Shopify"), "routes"), "root");
  if (root !== undefined && (typeof root !== "string" || !/^\/(?!\/)/.test(root))) {
    return "unsupported-root";
  }
  // A backslash or encoded authority that leaves the origin is refused here too.
  const base = new URL(root ?? basePath, location.origin);
  if (base.origin !== location.origin) return "unsupported-root";
  if (!base.pathname.endsWith("/")) base.pathname = `${base.pathname}/`;
  const url = new URL("cart.js", base);
  return `${url.origin}${url.pathname}`;
}

/**
 * Runs in the page: one bounded, uncached GET with the page's own cookies and no redirect. Only
 * primitive business fields are copied out.
 */
async function fetchCartInPage(input: {
  url: string;
  limitMs: number;
  maxItems: number;
}): Promise<PageResult> {
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- page.evaluate sends only this function to the page, so its helpers must be defined inside it.
  const primitive = (value: unknown): unknown =>
    typeof value === "number" || (typeof value === "string" && value.length <= 64) ? value : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.limitMs);
  try {
    const response = await fetch(input.url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).catch(() => undefined);
    if (response === undefined)
      return { status: controller.signal.aborted ? "timeout" : "network" };
    if (response.type === "opaqueredirect") return { status: "redirect-refused" };
    if (!response.ok) return { status: "http-status", httpStatus: response.status };
    const body: unknown = await response.json().catch(() => controller.signal);
    if (body === controller.signal) {
      return { status: controller.signal.aborted ? "timeout" : "invalid-json" };
    }
    if (typeof body !== "object" || body === null) return { status: "invalid-response" };
    const items: unknown = Reflect.get(body, "items");
    if (!Array.isArray(items) || items.length > input.maxItems) {
      return { status: "invalid-response" };
    }
    return {
      status: "ok",
      endpoint: input.url,
      itemCount: primitive(Reflect.get(body, "item_count")),
      items: items.map((item: unknown) => ({
        variantId:
          typeof item === "object" && item !== null
            ? primitive(Reflect.get(item, "variant_id"))
            : null,
        quantity:
          typeof item === "object" && item !== null
            ? primitive(Reflect.get(item, "quantity"))
            : null,
      })),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** The public code and fixed message for each page status. */
const READ_ERRORS = {
  "page-unavailable": [
    "unavailable",
    "The current page is not a storefront page, so the cart JSON was not read.",
  ],
  "unsupported-root": ["unavailable", "The page sets an unsupported window.Shopify.routes.root."],
  "redirect-refused": [
    "request-failed",
    "The cart JSON endpoint redirected; the redirect was not followed.",
  ],
  network: ["request-failed", "The cart JSON request failed."],
  "invalid-json": ["invalid-response", "The cart JSON response is not JSON."],
  "invalid-response": [
    "invalid-response",
    "The cart JSON response does not have the expected cart shape.",
  ],
} as const satisfies Record<string, readonly [CartReadErrorCode, string]>;

function readError(status: keyof typeof READ_ERRORS): CartReadError {
  const [code, message] = READ_ERRORS[status];
  return new CartReadError(code, message);
}

function snapshot(result: PageResult, timeoutMs: number): CartSnapshot {
  switch (result.status) {
    case "ok":
      return parseCart(result);
    case "timeout":
      throw new CartReadError("timeout", `The cart JSON did not arrive within ${timeoutMs} ms.`);
    case "http-status":
      throw new CartReadError(
        "request-failed",
        `The cart JSON endpoint answered HTTP ${result.httpStatus}.`,
        result.httpStatus,
      );
    default:
      throw readError(result.status);
  }
}

function parseCart(result: Extract<PageResult, { status: "ok" }>): CartSnapshot {
  const lines: CartLine[] = result.items.map((item) => {
    const variantId = variantGid(item.variantId);
    const quantity = item.quantity;
    if (variantId === undefined || !isCount(quantity) || quantity === 0) {
      throw readError("invalid-response");
    }
    return { variantId, quantity };
  });
  if (!isCount(result.itemCount)) {
    throw readError("invalid-response");
  }
  return { endpoint: result.endpoint, totalQuantity: result.itemCount, lines };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * A ProductVariant GID for an AJAX `variant_id`: a positive safe integer, or a decimal string of
 * one (so no precision is lost). Undefined for anything else.
 */
function variantGid(value: unknown): string | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? `${VARIANT_GID_PREFIX}${value}` : undefined;
  }
  if (typeof value === "string" && /^[1-9][0-9]{0,19}$/.test(value)) {
    return `${VARIANT_GID_PREFIX}${value}`;
  }
  return undefined;
}
