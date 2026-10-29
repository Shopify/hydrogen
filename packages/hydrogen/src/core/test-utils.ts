import { expect, vi } from "vitest";

import type { LogSeverity } from "./logging";
import type { ShopifyAccountWidgetData } from "./shopify-scripts/account-widget";

export const TEST_ACCOUNT_WIDGET_DATA: ShopifyAccountWidgetData = {
  customer: null,
  shop: { socialLoginProviders: ["shop"] },
};

export const TEST_ACCOUNT_WIDGET_CUSTOMER: NonNullable<ShopifyAccountWidgetData["customer"]> = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  avatarUrl: null,
};

/** The JSON that `<shopify-account>` reads for `TEST_ACCOUNT_WIDGET_DATA` in US English. */
export function getRenderedSignedOutAccountWidgetData(shopId: string) {
  return {
    customer: null,
    shop: {
      id: shopId,
      legacyCustomerAccounts: false,
      b2bEnabled: false,
      marketingConsentSigninEnabled: false,
      marketingConsentPreselected: false,
      socialLoginProviders: [{ handle: "Shop" }],
      customerAccountTranslations: [],
    },
    visitor: { country: "US", language: "EN" },
  };
}

type RenderedAccountWidgetData = { customer: { firstName: string | null } | null };
const shopifyAccountConnections: Array<RenderedAccountWidgetData | null> = [];

/**
 * Defines a stand-in `shopify-account` element that, like account.js, reads the JSON script tag
 * once when it connects. Returns the data each connection read, in order.
 */
export function recordShopifyAccountConnections() {
  if (!customElements.get("shopify-account")) {
    customElements.define(
      "shopify-account",
      class extends HTMLElement {
        connectedCallback() {
          const json = document.getElementById("shopify-customer-account-data")?.textContent;
          shopifyAccountConnections.push(json ? JSON.parse(json) : null);
        }
      },
    );
  }
  shopifyAccountConnections.length = 0;
  return shopifyAccountConnections;
}

export function assert<T>(value: T | null | undefined, message: string): asserts value is T {
  expect(value != null, message).toBe(true);
}

/**
 * Simulates a browser opaque response, such as a `redirect: "manual"` redirect: status 0, no
 * headers, and no body. Node can't construct one because `new Response()` rejects status 0.
 */
export function createOpaqueResponse(type: "opaque" | "opaqueredirect"): Response {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: type });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
}

type TestLogger = Record<LogSeverity, ReturnType<typeof vi.fn>>;

export function createTestLogger(): TestLogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}
