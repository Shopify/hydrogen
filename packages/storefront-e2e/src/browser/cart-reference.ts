import type { Page } from "playwright-core";

import { CartReferenceError, type CartReference } from "../scenario.ts";
import { isOpaqueId } from "../shopify/checkout.ts";

export const CART_REFERENCE_TIMEOUT_MS = 5_000;

type PageResult = CartReference | { status: "malformed" | "failed" | "timeout" };

/**
 * Asks the current page for its active cart with the read-only Shopify Standard Action
 * `window.Shopify.actions.getCart(payload?, options?)`, after `DOMContentLoaded`. It passes no
 * payload (so no cart is selected) and `options.signal`. This reader parses no cookies and
 * reads no DOM or cart summary values; only `cart.id` is used, as a candidate for a Storefront
 * API read.
 *
 * Resolves `unavailable` at once when the page has no such action, and `empty` for
 * `{ cart: null }`. Rejects with a fixed message (never page text or the ID) when the action
 * throws, returns another shape, or does not settle within `timeoutMs`. An abort rejects with
 * the abort reason.
 */
export async function readCartReference(
  page: Page,
  signal: AbortSignal,
  timeoutMs = CART_REFERENCE_TIMEOUT_MS,
): Promise<CartReference> {
  signal.throwIfAborted();
  const deadline = Date.now() + timeoutMs;
  const read = (async (): Promise<PageResult> => {
    await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs });
    // The page-side timer bounds the evaluation even if the action ignores its signal.
    return page.evaluate(
      async (limitMs): Promise<PageResult> => {
        // oxlint-disable-next-line unicorn/consistent-function-scoping -- page.evaluate sends only this function to the page, so its helpers must be defined inside it.
        const field = (value: unknown, name: string): unknown =>
          typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined;
        const classify = (result: unknown): PageResult => {
          if (typeof result !== "object" || result === null || !("cart" in result)) {
            return { status: "malformed" };
          }
          if (result.cart === null) return { status: "empty" };
          const id = field(result.cart, "id");
          return typeof id === "string"
            ? { status: "available", cartId: id }
            : { status: "malformed" };
        };
        const actions = field(Reflect.get(window, "Shopify"), "actions");
        const getCart = field(actions, "getCart");
        if (typeof getCart !== "function") return { status: "unavailable" };
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<"timeout">((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve("timeout");
          }, limitMs);
        });
        try {
          const result: unknown = await Promise.race([
            // getCart(payload?, options?): no payload, so no cart is selected; the abort signal
            // goes in `options`.
            Reflect.apply(getCart, actions, [undefined, { signal: controller.signal }]),
            timeout,
          ]);
          return result === "timeout" ? { status: "timeout" } : classify(result);
        } catch {
          return { status: "failed" };
        } finally {
          clearTimeout(timer);
        }
      },
      Math.max(1, deadline - Date.now()),
    );
  })();
  read.catch(() => undefined);

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  aborted.catch(() => undefined);
  let result: PageResult;
  try {
    result = await Promise.race([read, aborted]);
  } catch {
    signal.throwIfAborted();
    throw new CartReferenceError("unreadable", "The page cart action could not be read.");
  } finally {
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
  switch (result.status) {
    case "available":
      if (!isOpaqueId(result.cartId)) {
        throw new CartReferenceError(
          "unusable-id",
          "The page cart action returned an unusable cart ID.",
        );
      }
      return result;
    case "empty":
    case "unavailable":
      return result;
    case "timeout":
      throw new CartReferenceError(
        "timeout",
        `The page cart action did not settle within ${timeoutMs} ms.`,
      );
    case "malformed":
      throw new CartReferenceError("malformed", "The page cart action returned an unknown shape.");
    case "failed":
      throw new CartReferenceError("failed", "The page cart action failed.");
  }
}
