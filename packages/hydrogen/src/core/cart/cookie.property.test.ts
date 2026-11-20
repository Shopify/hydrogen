import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createCartCookie, getCartIdFromCookie } from "./cookie";

const CART_GID_PREFIX = "gid://shopify/Cart/";

/** Cart tokens made of the characters a Cookie header gives a meaning to, and of any other text. */
const cartToken = fc.oneof(
  fc.string({ minLength: 1 }),
  fc.string({ unit: "binary", minLength: 1 }),
);

/** Other cookies a browser sends along, some with names that resemble the cart cookie's. */
const otherCookie = fc
  .tuple(
    fc.constantFrom("session", "mycart", "cart_id", "Cart", "_cart", "theme"),
    fc.stringMatching(/^[A-Za-z0-9%=_.-]{0,12}$/),
  )
  .map(([name, value]) => `${name}=${value}`);
const otherCookies = fc.array(otherCookie, { maxLength: 3 });

describe("the cart cookie", () => {
  it("reads back the cart ID it stored, whatever characters its token holds and whatever cookies surround it", () => {
    fc.assert(
      fc.property(cartToken, otherCookies, otherCookies, (token, before, after) => {
        const cartId = `${CART_GID_PREFIX}${token}`;
        // A browser keeps the name and value of a Set-Cookie header and drops its attributes.
        const [stored] = createCartCookie(cartId).split(";");
        const cookie = [...before, stored, ...after].join("; ");

        expect(getCartIdFromCookie({ cookie })).toBe(cartId);
      }),
    );
  });
});
