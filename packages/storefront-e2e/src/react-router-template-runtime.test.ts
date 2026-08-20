import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CUSTOMER_SESSION_COOKIE_NAME,
  EncryptedCookieCustomerSession,
} from "../../../templates/react-router/app/lib/customer-session";
import {
  createPublicRequest,
  requestForShopifyContext,
} from "../../../templates/react-router/app/lib/request-sanitization";
import {
  assertCustomerAccountShop,
  resolveRuntimeConfig,
} from "../../../templates/react-router/app/lib/shop";

const SESSION_SECRET = "a-secure-customer-session-secret-32-bytes";

describe("resolveRuntimeConfig", () => {
  it("uses mock.shop when no private token is configured", () => {
    expect(resolveRuntimeConfig({})).toMatchObject({
      enableAnalyticsTestTap: false,
      storeDomain: "mock.shop",
      usingMockShop: true,
    });
  });

  it("enables analytics test capture only for explicit mock mode", () => {
    expect(resolveRuntimeConfig({ MOCK_SHOP: "1" }).enableAnalyticsTestTap).toBe(true);
  });

  it("requires complete real-store identity once a private token is present", () => {
    expect(() => resolveRuntimeConfig({ PRIVATE_STOREFRONT_API_TOKEN: "private-token" })).toThrow(
      "PUBLIC_STORE_DOMAIN is required",
    );
  });

  it("accepts complete real-store identity", () => {
    expect(
      resolveRuntimeConfig({
        PRIVATE_STOREFRONT_API_TOKEN: "private-token",
        PUBLIC_STOREFRONT_ID: "storefront-id",
        PUBLIC_STORE_DOMAIN: "example.myshopify.com",
      }),
    ).toMatchObject({
      privateStorefrontToken: "private-token",
      storeDomain: "example.myshopify.com",
      storefrontId: "storefront-id",
      usingMockShop: false,
    });
  });

  it("rejects partial Customer Account configuration", () => {
    expect(() =>
      resolveRuntimeConfig({
        PRIVATE_STOREFRONT_API_TOKEN: "private-token",
        PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client-id",
        PUBLIC_STOREFRONT_ID: "storefront-id",
        PUBLIC_STORE_DOMAIN: "example.myshopify.com",
      }),
    ).toThrow("Customer Accounts require");
  });

  it("rejects Customer Account configuration for a different shop", () => {
    const config = resolveRuntimeConfig({
      CUSTOMER_ACCOUNT_SESSION_SECRET: SESSION_SECRET,
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client-id",
      PUBLIC_STOREFRONT_ID: "storefront-id",
      PUBLIC_STORE_DOMAIN: "example.myshopify.com",
      SHOP_ID: "1",
    });

    expect(() => assertCustomerAccountShop(config, "gid://shopify/Shop/2")).toThrow(
      "does not match",
    );
  });
});

describe("requestForShopifyContext", () => {
  it("removes the customer session cookie without consuming the original body", async () => {
    const request = new Request("https://example.com/contact", {
      method: "POST",
      headers: { cookie: `${CUSTOMER_SESSION_COOKIE_NAME}=secret; cart=id` },
      body: "message=hello",
    });

    const shopifyRequest = requestForShopifyContext(request);

    expect(shopifyRequest).not.toBe(request);
    expect(shopifyRequest.headers.get("cookie")).toBe("cart=id");
    expect(request.headers.get("cookie")).toContain(CUSTOMER_SESSION_COOKIE_NAME);
    expect(await shopifyRequest.text()).toBe("message=hello");
    expect(await request.text()).toBe("message=hello");
  });

  it("normalizes local HTTPS forwarding headers", () => {
    const request = new Request("http://localhost:5173/account/login", {
      headers: {
        "x-forwarded-host": "local.tryhydrogen.dev:5173",
        "x-forwarded-proto": "https",
      },
    });

    expect(createPublicRequest(request).url).toBe(
      "https://local.tryhydrogen.dev:5173/account/login",
    );
  });

  it("ignores untrusted forwarding hosts", () => {
    const request = new Request("https://store.example/account/login", {
      headers: {
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(createPublicRequest(request)).toBe(request);
    expect(request.url).toBe("https://store.example/account/login");
  });

  it("ignores local forwarding headers on a production-style request URL", () => {
    const request = new Request("https://store.example/account/login", {
      headers: {
        "x-forwarded-host": "local.tryhydrogen.dev:5173",
        "x-forwarded-proto": "https",
      },
    });

    expect(createPublicRequest(request)).toBe(request);
  });
});

describe("EncryptedCookieCustomerSession", () => {
  afterEach(() => vi.useRealTimers());

  it("round-trips encrypted session values with secure cookie attributes", async () => {
    const session = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account"),
      SESSION_SECRET,
    );
    session.setSessionItem("token", "secret-token");

    const setCookie = requireSetCookie(await session.commit());
    expect(setCookie).toContain(`${CUSTOMER_SESSION_COOKIE_NAME}=v1.`);
    expect(setCookie).not.toContain("secret-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=");

    const restored = await EncryptedCookieCustomerSession.init(
      requestWithCookie(setCookie),
      SESSION_SECRET,
    );
    expect(restored.getSessionItem("token")).toBe("secret-token");
  });

  it("rejects tampered cookies and clears them on commit", async () => {
    const session = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account"),
      SESSION_SECRET,
    );
    session.setSessionItem("token", "secret-token");
    const setCookie = requireSetCookie(await session.commit());
    const [cookie] = setCookie.split(";");
    const [version, iv, ciphertext] = cookie.split(".");
    const replacement = ciphertext.startsWith("A") ? "B" : "A";
    const tamperedCookie = [version, iv, `${replacement}${ciphertext.slice(1)}`].join(".");

    const restored = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account", { headers: { cookie: tamperedCookie } }),
      SESSION_SECRET,
    );

    expect(restored.getSessionItem("token")).toBeUndefined();
    expect(requireSetCookie(await restored.commit())).toContain("Max-Age=0");
  });

  it("rejects oversized inbound cookies before decryption", async () => {
    const restored = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account", {
        headers: { cookie: `${CUSTOMER_SESSION_COOKIE_NAME}=${"x".repeat(5_000)}` },
      }),
      SESSION_SECRET,
    );

    expect(restored.getSessionItem("token")).toBeUndefined();
    expect(requireSetCookie(await restored.commit())).toContain("Max-Age=0");
  });

  it("rejects expired encrypted sessions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const session = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account"),
      SESSION_SECRET,
    );
    session.setSessionItem("token", "secret-token");
    const setCookie = requireSetCookie(await session.commit());

    vi.setSystemTime(new Date("2026-01-09T00:00:00Z"));
    const restored = await EncryptedCookieCustomerSession.init(
      requestWithCookie(setCookie),
      SESSION_SECRET,
    );

    expect(restored.getSessionItem("token")).toBeUndefined();
    expect(requireSetCookie(await restored.commit())).toContain("Max-Age=0");
  });

  it("does not extend the absolute expiry when the session changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const session = await EncryptedCookieCustomerSession.init(
      new Request("https://example.com/account"),
      SESSION_SECRET,
    );
    session.setSessionItem("token", "secret-token");
    const originalCookie = requireSetCookie(await session.commit());

    vi.setSystemTime(new Date("2026-01-07T00:00:00Z"));
    const refreshed = await EncryptedCookieCustomerSession.init(
      requestWithCookie(originalCookie),
      SESSION_SECRET,
    );
    refreshed.setSessionItem("token", "refreshed-token");
    const refreshedCookie = requireSetCookie(await refreshed.commit());

    vi.setSystemTime(new Date("2026-01-09T00:00:00Z"));
    const expired = await EncryptedCookieCustomerSession.init(
      requestWithCookie(refreshedCookie),
      SESSION_SECRET,
    );
    expect(expired.getSessionItem("token")).toBeUndefined();
  });
});

function requestWithCookie(setCookie: string): Request {
  return new Request("https://example.com/account", {
    headers: { cookie: setCookie.split(";", 1)[0] },
  });
}

function requireSetCookie(headers: Headers | undefined): string {
  const value = headers?.get("set-cookie");
  if (!value) throw new Error("Expected Set-Cookie header");
  return value;
}
