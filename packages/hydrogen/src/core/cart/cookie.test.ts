import { describe, it, expect } from "vitest";

import {
  getCartIdFromCookie,
  getCartIdFromBindingCookie,
  getBoundCartId,
  createCartCookie,
  createCartBindingCookie,
  createExpiredCartBindingCookie,
} from "./cookie";

function requestWithCookies(cookies: string): Request {
  return new Request("http://localhost/api/cart", {
    headers: cookies ? { cookie: cookies } : {},
  });
}

function bindingRequest(cookie: string, scheme = "https") {
  return new Request(`${scheme}://shop.example/account/refresh`, { headers: { cookie } });
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

  it.each([
    "cart=attacker; cart=victim",
    "cart=victim; cart=attacker",
    "cart=victim; cart=victim",
    "cart=; cart=victim",
    "cart=%",
    "cart=%E0%A4",
  ])("ignores ambiguous or malformed cookies: %s", (cookie) => {
    expect(getCartIdFromCookie(requestWithCookies(cookie))).toBeNull();
  });

  it("reads cart ID from a request context cookie", () => {
    expect(getCartIdFromCookie({ cookie: "cart=context-token" })).toBe(
      "gid://shopify/Cart/context-token",
    );
  });
});

describe("cart ownership binding", () => {
  const cartId = "gid://shopify/Cart/victim?key=secret";
  const visibleCookie = "cart=victim%3Fkey%3Dsecret";
  const bindingCookie = `__Host-hydrogen-cart=${encodeURIComponent(cartId)}`;

  it("requires the full cart ID, including its key, to match the binding", () => {
    expect(getBoundCartId(bindingRequest(`${visibleCookie}; ${bindingCookie}`))).toBe(cartId);
    expect(
      getBoundCartId(bindingRequest(`cart=victim%3Fkey%3Dother-secret; ${bindingCookie}`)),
    ).toBeNull();
  });

  it("normalizes token and GID representations without stripping the secret", () => {
    expect(
      getBoundCartId(
        bindingRequest(
          `cart=${encodeURIComponent(cartId)}; __Host-hydrogen-cart=victim%3Fkey%3Dsecret`,
        ),
      ),
    ).toBe(cartId);
  });

  it.each([
    "",
    visibleCookie,
    bindingCookie,
    `${visibleCookie}; __Host-hydrogen-cart=attacker`,
    `cart=attacker; ${visibleCookie}; ${bindingCookie}`,
    `${visibleCookie}; cart=attacker; ${bindingCookie}`,
    `${visibleCookie}; ${bindingCookie}; __Host-hydrogen-cart=attacker`,
    `${visibleCookie}; __Host-hydrogen-cart=attacker; ${bindingCookie}`,
    `${visibleCookie}; ${bindingCookie}; ${bindingCookie}`,
    `${visibleCookie}; __Host-hydrogen-cart=`,
    `${visibleCookie}; __Host-hydrogen-cart=%`,
    `cart=%; ${bindingCookie}`,
  ])("fails closed for missing, mismatched, duplicate, or malformed cookies: %s", (cookie) => {
    expect(getBoundCartId(bindingRequest(cookie))).toBeNull();
  });

  it("accepts a browser-protected binding after a proxy terminates TLS", () => {
    const proxiedRequest = bindingRequest(`${visibleCookie}; ${bindingCookie}`, "http");
    expect(getCartIdFromBindingCookie(proxiedRequest)).toBe(cartId);
    expect(getBoundCartId(proxiedRequest)).toBe(cartId);
  });

  it("can retrieve the protected cart for cleanup despite a replaced visible cookie", () => {
    expect(getCartIdFromBindingCookie(bindingRequest(`cart=attacker; ${bindingCookie}`))).toBe(
      cartId,
    );
  });

  it.each([
    "",
    "cart=",
    "cart=%",
    "cart=%E0%A4",
    `cart=attacker; ${visibleCookie}`,
    `${visibleCookie}; cart=attacker`,
  ])("recovers an unusable visible cookie without authorizing attachment: %s", (cookie) => {
    const request = bindingRequest([cookie, bindingCookie].filter(Boolean).join("; "));
    expect(getCartIdFromCookie(request)).toBe(cartId);
    expect(getCartIdFromCookie({ cookie: request.headers.get("cookie") ?? "" })).toBe(cartId);
    expect(getBoundCartId(request)).toBeNull();
  });

  it.each([
    "__Host-hydrogen-cart=",
    "__Host-hydrogen-cart=%",
    `${bindingCookie}; ${bindingCookie}`,
  ])("does not recover a missing visible cookie from an invalid binding: %s", (cookie) => {
    expect(getCartIdFromCookie(bindingRequest(cookie))).toBeNull();
  });

  it("preserves a different well-formed visible cart without authorizing attachment", () => {
    const request = bindingRequest(`cart=replacement; ${bindingCookie}`);
    expect(getCartIdFromCookie(request)).toBe("gid://shopify/Cart/replacement");
    expect(getBoundCartId(request)).toBeNull();
  });

  it("does not recover duplicates from an ambiguous binding", () => {
    expect(
      getCartIdFromCookie(
        bindingRequest(`cart=attacker; ${visibleCookie}; ${bindingCookie}; ${bindingCookie}`),
      ),
    ).toBeNull();
  });

  it("issues only host-bound, server-readable cookies and expires the same scope", () => {
    const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
    expect(createCartBindingCookie(cartId)).toBe(
      `${bindingCookie}; ${attributes}; Max-Age=1209600`,
    );
    expect(createExpiredCartBindingCookie()).toBe(
      `__Host-hydrogen-cart=; ${attributes}; Max-Age=0`,
    );
    expect(createCartBindingCookie(cartId)).not.toMatch(/Domain=/i);
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
