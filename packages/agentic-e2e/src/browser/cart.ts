import { errors, type APIRequestContext } from "playwright-core";
import { z } from "zod";

export const CART_READ_TIMEOUT_MS = 5_000;
const MAX_CART_ITEMS = 500;

export type CartSnapshot = { lines: Array<{ variantId: string; quantity: number }> };

/** The cart could not be read. The message is fixed text, never response content. */
export class CartReadError extends Error {
  override name = "CartReadError";
}

/** Added to every bad answer of the cart JSON endpoint. */
const NOT_CONFIGURED =
  " This storefront does not serve a usable cart.js (cart.js is not configured), so the cart was not checked.";
const MESSAGES = {
  redirect: `the cart JSON endpoint redirected; the redirect was not followed.${NOT_CONFIGURED}`,
  invalidJson: `the cart JSON response is not JSON.${NOT_CONFIGURED}`,
  network: "the cart JSON request failed.",
  timeout: `the cart JSON did not arrive within ${CART_READ_TIMEOUT_MS} ms.`,
};
const INVALID_SHAPE = `the cart JSON response does not have the expected cart shape.${NOT_CONFIGURED}`;

/**
 * Reads the cart of the browser session once with `GET <origin>/cart.js`, where `origin` is the
 * origin the product page landed on. The request goes through `request`, the browser context's
 * request API, which sends the cookies of the browser's cookie store: the location of the open
 * page does not matter, and this needs no cart ID and sets no cookie itself. Redirects are not
 * followed, and the 5-second limit includes the body (Playwright reads the whole body before
 * the response resolves). Every problem throws a {@link CartReadError}.
 */
export async function readCart(request: APIRequestContext, origin: string): Promise<CartSnapshot> {
  let status: number;
  let text: string;
  try {
    const response = await request.get(new URL("/cart.js", origin).href, {
      headers: { accept: "application/json" },
      maxRedirects: 0,
      failOnStatusCode: false,
      timeout: CART_READ_TIMEOUT_MS,
    });
    try {
      status = response.status();
      text = await response.text();
    } finally {
      // Frees the stored body. The context closes with the browser anyway.
      await response.dispose().catch(() => undefined);
    }
  } catch (error) {
    // Playwright throws on a timeout (`TimeoutError`) and on a network error or a closed context.
    throw new CartReadError(
      error instanceof errors.TimeoutError ? MESSAGES.timeout : MESSAGES.network,
    );
  }
  if (status >= 300 && status < 400) throw new CartReadError(MESSAGES.redirect);
  if (status < 200 || status >= 300) {
    throw new CartReadError(`the cart JSON endpoint answered HTTP ${status}.${NOT_CONFIGURED}`);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new CartReadError(MESSAGES.invalidJson);
  }
  return parseCartPayload(body);
}

const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";
const variantId = z
  .union([
    z.number().refine((value) => Number.isSafeInteger(value) && value > 0),
    z.string().regex(/^[1-9][0-9]{0,19}$/),
  ])
  .transform((value) => `${VARIANT_GID_PREFIX}${value}`);
const quantity = z.number().refine((value) => Number.isSafeInteger(value) && value > 0);
const cartSchema = z.object({
  items: z.array(z.object({ variant_id: variantId, quantity })).max(MAX_CART_ITEMS),
});

/** Converts the parsed cart JSON. Throws a {@link CartReadError} for a wrong shape. */
export function parseCartPayload(body: unknown): CartSnapshot {
  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) throw new CartReadError(INVALID_SHAPE);
  return {
    lines: parsed.data.items.map((item) => ({
      variantId: item.variant_id,
      quantity: item.quantity,
    })),
  };
}
