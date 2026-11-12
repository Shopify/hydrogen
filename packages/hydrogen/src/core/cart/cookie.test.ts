import { describe, it, expect } from "vitest";

import {
  createCartCookie,
  createExpiredSellerCartCookie,
  createSellerCartCookie,
  getCartIdFromCookie,
  getSellerCartIdFromCookie,
  getSellerCartsFromCookie,
  isSellerHandle,
  planSellerCookieEvictions,
} from "./cookie";

function requestWithCookies(cookies: string): Request {
  return new Request("http://localhost/api/cart", {
    headers: cookies ? { cookie: cookies } : {},
  });
}

describe("getCartIdFromCookie", () => {
  it("reconstructs full GID from token cookie", () => {
    const request = requestWithCookies("cart=Z2NwLXVzLWNlbnRyYWwx");
    expect(getCartIdFromCookie(request)).toBe("gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwx");
  });

  it("extracts cart ID when other cookies are present", () => {
    const request = requestWithCookies("session=abc; cart=some-token-456; theme=dark");
    expect(getCartIdFromCookie(request)).toBe("gid://shopify/Cart/some-token-456");
  });

  it("returns null when no cookie header", () => {
    const request = new Request("http://localhost/api/cart");
    expect(getCartIdFromCookie(request)).toBeNull();
  });

  it("returns null when cart cookie is missing", () => {
    const request = requestWithCookies("session=abc; theme=dark");
    expect(getCartIdFromCookie(request)).toBeNull();
  });

  it("returns null when cart cookie has empty value", () => {
    const request = requestWithCookies("cart=");
    expect(getCartIdFromCookie(request)).toBeNull();
  });

  it("returns null for a malformed cart cookie", () => {
    expect(getCartIdFromCookie(requestWithCookies("cart=%FF"))).toBeNull();
  });

  it("reads cart ID from a request context cookie", () => {
    expect(getCartIdFromCookie({ cookie: "cart=context-token" })).toBe(
      "gid://shopify/Cart/context-token",
    );
  });
});

describe("createCartCookie", () => {
  it("strips GID prefix and stores token only (matches Standard Actions)", () => {
    const cookie = createCartCookie("gid://shopify/Cart/123");
    expect(cookie).toContain("cart=123");
    expect(cookie).not.toContain("gid%3A");
  });

  it("stores token as-is when no GID prefix", () => {
    const cookie = createCartCookie("Z2NwLXVzLWNlbnRyYWwx");
    expect(cookie).toContain("cart=Z2NwLXVzLWNlbnRyYWwx");
  });

  it("URL-encodes special characters in token", () => {
    const cookie = createCartCookie("gid://shopify/Cart/abc=def");
    expect(cookie).toContain("cart=abc%3Ddef");
  });

  it("includes correct cookie attributes", () => {
    const cookie = createCartCookie("gid://shopify/Cart/123");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=1209600");
  });

  it("round-trips with getCartIdFromCookie", () => {
    const originalId = "gid://shopify/Cart/Z2NwLXVzLWNlbnRyYWwx";
    const cookie = createCartCookie(originalId);
    const cookieValue = cookie.split(";")[0];
    const request = requestWithCookies(cookieValue);
    expect(getCartIdFromCookie(request)).toBe(originalId);
  });
});

const NOW = Date.UTC(2026, 10, 9, 12, 0, 0);
const NOW_SECONDS = NOW / 1000;

function sellerPair(seller: string, token: string, writtenAt = NOW_SECONDS): string {
  return `hydrogen-cart.${seller}=${writtenAt}|${encodeURIComponent(token)}`;
}

function sellers(cookie: string) {
  return getSellerCartsFromCookie({ cookie }).map(({ seller, cartId, writtenAt }) => ({
    seller,
    cartId,
    writtenAt,
  }));
}

describe("isSellerHandle", () => {
  it.each(["a", "raycon", "f822a6-3", "0", "a".repeat(63)])("accepts %s", (handle) => {
    expect(isSellerHandle(handle)).toBe(true);
  });

  it.each(["", "-raycon", "Raycon", "ray.con", "ray_con", "a".repeat(64), "raycon.myshopify.com"])(
    "rejects %j",
    (handle) => {
      expect(isSellerHandle(handle)).toBe(false);
    },
  );
});

describe("getSellerCartsFromCookie", () => {
  it("reads seller carts with their write times, most recent first and ties by handle", () => {
    const cookie = [
      "cart=home-token",
      sellerPair("raycon", "r1?key=a", NOW_SECONDS - 10),
      sellerPair("zeta", "z1?key=b"),
      sellerPair("alpha", "a1?key=c"),
      "_shopify_essential=x",
    ].join("; ");

    expect(sellers(cookie)).toEqual([
      { seller: "alpha", cartId: "gid://shopify/Cart/a1?key=c", writtenAt: NOW_SECONDS },
      { seller: "zeta", cartId: "gid://shopify/Cart/z1?key=b", writtenAt: NOW_SECONDS },
      { seller: "raycon", cartId: "gid://shopify/Cart/r1?key=a", writtenAt: NOW_SECONDS - 10 },
    ]);
  });

  it("reads from a request", () => {
    const request = requestWithCookies(sellerPair("raycon", "r1?key=a"));

    expect(getSellerCartIdFromCookie(request, "raycon")).toBe("gid://shopify/Cart/r1?key=a");
    expect(getSellerCartIdFromCookie(request, "other")).toBeNull();
  });

  it.each([
    ["an invalid handle", `hydrogen-cart.Raycon=${NOW_SECONDS}|t`],
    ["a dotted handle", `hydrogen-cart.a.b=${NOW_SECONDS}|t`],
    ["a missing timestamp", "hydrogen-cart.raycon=t"],
    ["an empty token", `hydrogen-cart.raycon=${NOW_SECONDS}|`],
    ["a malformed encoding", `hydrogen-cart.raycon=${NOW_SECONDS}|%FF`],
    ["a cart_ prefix", `cart_raycon=${NOW_SECONDS}|t`],
  ])("ignores %s", (_label, cookie) => {
    expect(sellers(cookie)).toEqual([]);
  });

  it("ignores values over 256 bytes before decoding them", () => {
    const prefix = `${NOW_SECONDS}|`;
    const fits = sellerPair("fits", "x".repeat(256 - prefix.length));
    const tooLong = sellerPair("long", "x".repeat(257 - prefix.length));

    expect(sellers(`${fits}; ${tooLong}`).map(({ seller }) => seller)).toEqual(["fits"]);
  });

  it("returns at most 10 sellers, keeping the most recently written", () => {
    const cookie = Array.from({ length: 12 }, (_, index) =>
      sellerPair(`s${index}`, `t${index}`, NOW_SECONDS - index),
    ).join("; ");

    expect(sellers(cookie).map(({ seller }) => seller)).toEqual(
      Array.from({ length: 10 }, (_, index) => `s${index}`),
    );
  });

  it("stops at 2,048 bytes in total", () => {
    const token = "x".repeat(200);
    const cookie = Array.from({ length: 10 }, (_, index) =>
      sellerPair(`s${index}`, token, NOW_SECONDS - index),
    ).join("; ");
    const pairBytes = sellerPair("s0", token).length;

    const result = getSellerCartsFromCookie({ cookie });

    expect(result).toHaveLength(Math.floor(2048 / pairBytes));
    expect(result.reduce((sum, { bytes }) => sum + bytes, 0)).toBeLessThanOrEqual(2048);
    expect(result.map(({ seller }) => seller)).toEqual(
      Array.from({ length: result.length }, (_, index) => `s${index}`),
    );
  });
});

describe("createSellerCartCookie", () => {
  it("stores the write time and the encoded cart token in an HttpOnly cookie", () => {
    const cookie = createSellerCartCookie("raycon", "gid://shopify/Cart/r1?key=a", {
      secure: false,
      now: NOW,
    });

    expect(cookie).toBe(
      `hydrogen-cart.raycon=${NOW_SECONDS}|r1%3Fkey%3Da; Path=/; SameSite=Lax; HttpOnly; Max-Age=1209600`,
    );
  });

  it("adds Secure when asked", () => {
    expect(createSellerCartCookie("raycon", "r1", { secure: true, now: NOW })).toMatch(/; Secure$/);
  });

  it.each([
    ["10 days ahead", new Date(NOW + 10 * 86_400_000).toISOString(), 864_000],
    ["60 days ahead (clamped)", new Date(NOW + 60 * 86_400_000).toISOString(), 2_592_000],
    ["in the past", new Date(NOW - 1000).toISOString(), 0],
    ["missing", undefined, 1_209_600],
    ["unparsable", "not a date", 1_209_600],
  ])("sets Max-Age from expiresAt %s", (_label, expiresAt, maxAge) => {
    const cookie = createSellerCartCookie("raycon", "r1", { expiresAt, secure: false, now: NOW });

    expect(cookie).toContain(`; Max-Age=${maxAge}`);
  });

  it("throws for an invalid handle", () => {
    expect(() => createSellerCartCookie("Bad.Handle", "r1", { secure: false })).toThrow(TypeError);
  });

  it("round-trips with getSellerCartIdFromCookie", () => {
    const cartId = "gid://shopify/Cart/hWN5?key=abc";
    const cookie = createSellerCartCookie("f822a6-3", cartId, { secure: false });

    expect(getSellerCartIdFromCookie({ cookie: cookie.split(";")[0] }, "f822a6-3")).toBe(cartId);
  });
});

describe("createExpiredSellerCartCookie", () => {
  it("expires the seller cookie with the same attributes", () => {
    expect(createExpiredSellerCartCookie("raycon", { secure: true })).toBe(
      "hydrogen-cart.raycon=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Secure",
    );
  });
});

describe("planSellerCookieEvictions", () => {
  function tenSellers(): string {
    return Array.from({ length: 10 }, (_, index) =>
      sellerPair(`s${index}`, `t${index}`, NOW_SECONDS - 100 + (index % 5)),
    ).join("; ");
  }

  it("evicts nothing below the caps", () => {
    const cookie = `cart=home; ${sellerPair("a", "t1")}`;

    expect(planSellerCookieEvictions({ cookie }, "b", "t2", NOW)).toEqual([]);
  });

  it("evicts the least recently written seller, ties by handle, when an 11th seller arrives", () => {
    // s0 and s5 share the oldest write time; s5 sorts after s0, so it goes first.
    expect(planSellerCookieEvictions({ cookie: tenSellers() }, "new", "t", NOW)).toEqual(["s5"]);
  });

  it("evicts nothing when rewriting a seller that already has a cookie", () => {
    expect(planSellerCookieEvictions({ cookie: tenSellers() }, "s3", "t", NOW)).toEqual([]);
  });

  it("evicts the oldest sellers until the new cookie fits the byte budget", () => {
    const token = "x".repeat(200);
    const cookie = Array.from({ length: 9 }, (_, index) =>
      sellerPair(`s${index}`, token, NOW_SECONDS - index),
    ).join("; ");

    const evicted = planSellerCookieEvictions({ cookie }, "new", token, NOW);
    const kept = Array.from({ length: 9 }, (_, index) => `s${index}`).filter(
      (seller) => !evicted.includes(seller),
    );
    const pairBytes = sellerPair("s0", token).length;

    expect(evicted).toEqual(["s7", "s8"]);
    expect((kept.length + 1) * pairBytes).toBeLessThanOrEqual(2048);
  });

  it("never plans to expire the cart cookie or other cookies", () => {
    const cookie = `cart=home; cart_currency=USD; session=1; ${tenSellers()}`;

    const evicted = planSellerCookieEvictions({ cookie }, "new", "t", NOW);

    expect(evicted.every((seller) => /^s\d$/.test(seller))).toBe(true);
  });
});
