import { describe, it, expect } from "vitest";

import { getCartIdFromCookie, createCartCookie } from "./cookie";

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
