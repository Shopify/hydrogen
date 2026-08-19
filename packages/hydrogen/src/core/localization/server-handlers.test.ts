import { afterEach, describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { configureLogging, resetLoggingForTests } from "../logging";
import type { ShopifyRouteSessionManager } from "../request-routing/registered-routes";
import { createTestLogger } from "../test-utils";
import {
  DEFAULT_LOCALIZATION_CACHE_CONTROL,
  LOCALIZATION_API_PATH,
  LOCALIZATION_SESSION_KEY,
} from "./constants";
import type { LocalizationConfig } from "./locale-matching";
import { createLocalizationServerHandlers } from "./server-handlers";

const HANDLER_CONFIG: LocalizationConfig = {
  defaultLocale: { country: "US", language: "EN" },
  supportedLocales: "all",
};

const LIVE_LOCALIZATION = {
  country: {
    isoCode: "US",
    name: "United States",
    currency: { isoCode: "USD", symbol: "$" },
    availableLanguages: [{ isoCode: "EN", endonymName: "English", name: "English" }],
  },
  language: { isoCode: "EN", endonymName: "English", name: "English" },
  market: { handle: "global" },
  availableCountries: [
    {
      isoCode: "CA",
      name: "Canada",
      currency: { isoCode: "CAD", symbol: "$" },
      availableLanguages: [
        { isoCode: "EN", endonymName: "English", name: "English" },
        { isoCode: "FR", endonymName: "Français", name: "French" },
      ],
    },
    {
      isoCode: "DE",
      name: "Germany",
      currency: { isoCode: "EUR", symbol: "€" },
      availableLanguages: [{ isoCode: "DE", endonymName: "Deutsch", name: "German" }],
    },
    {
      isoCode: "US",
      name: "United States",
      currency: { isoCode: "USD", symbol: "$" },
      availableLanguages: [{ isoCode: "EN", endonymName: "English", name: "English" }],
    },
  ],
};

type MockClientOptions = {
  localization?: unknown;
  errors?: Array<{ message: string }>;
  cartUserErrors?: Array<{ message: string }>;
  cartError?: Error;
};

function mockStorefrontClient(options: MockClientOptions = {}) {
  const graphql = vi.fn(async (document: unknown) => {
    if (String(document).includes("cartBuyerIdentityUpdate")) {
      if (options.cartError) throw options.cartError;
      return {
        data: {
          cartBuyerIdentityUpdate: {
            cart: { id: "gid://shopify/Cart/1" },
            userErrors: options.cartUserErrors ?? [],
          },
        },
        headers: new Headers(),
      };
    }
    return {
      data: { localization: options.localization ?? LIVE_LOCALIZATION },
      ...(options.errors && { errors: options.errors }),
      headers: new Headers(),
    };
  });
  return {
    client: { graphql } as unknown as Pick<StorefrontClient, "graphql">,
    graphql,
  };
}

function mockSessionManager(
  overrides: Partial<ShopifyRouteSessionManager> = {},
): ShopifyRouteSessionManager {
  return {
    getSessionOrigin: () => "https://store.example",
    getSessionItem: vi.fn(),
    setSessionItem: vi.fn(),
    removeSessionItem: vi.fn(),
    commit: vi.fn(async () => ({ "set-cookie": "session=updated" })),
    ...overrides,
  };
}

function getRequest(search = "") {
  return new Request(`https://store.example${LOCALIZATION_API_PATH}${search}`);
}

function postRequest(fields: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request(`https://store.example${LOCALIZATION_API_PATH}`, {
    method: "POST",
    body: new URLSearchParams(fields),
    headers,
  });
}

type PostContextOverrides = {
  client?: Pick<StorefrontClient, "graphql">;
  sessionManager?: ShopifyRouteSessionManager;
};

function postContext(request: Request, overrides: PostContextOverrides = {}) {
  return {
    request,
    storefrontClient: overrides.client ?? mockStorefrontClient().client,
    sessionManager: overrides.sessionManager ?? mockSessionManager(),
  };
}

afterEach(() => {
  resetLoggingForTests();
});

describe("createLocalizationServerHandlers", () => {
  it("registers both handlers on the default path", () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    expect(handlers.get.pathname).toBe(LOCALIZATION_API_PATH);
    expect(handlers.get.method).toBe("GET");
    expect(handlers.post.pathname).toBe(LOCALIZATION_API_PATH);
    expect(handlers.post.method).toBe("POST");
  });

  it("supports a custom path", () => {
    const handlers = createLocalizationServerHandlers({ ...HANDLER_CONFIG, path: "/api/locale" });

    expect(handlers.get.pathname).toBe("/api/locale");
    expect(handlers.post.pathname).toBe("/api/locale");
  });
});

describe("localization GET handler", () => {
  it("returns a locale-anonymous payload of available countries and market", async () => {
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.get({ request: getRequest(), storefrontClient: client });

    expect(result.type).toBe("json");
    if (result.type !== "json") return;
    expect(result.data).toEqual({
      availableCountries: LIVE_LOCALIZATION.availableCountries,
      market: LIVE_LOCALIZATION.market,
    });
    expect(result.data).not.toHaveProperty("country");
    expect(result.data).not.toHaveProperty("language");
  });

  it("applies the default public cache policy", async () => {
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.get({ request: getRequest(), storefrontClient: client });

    if (result.type !== "json") throw new Error("expected json result");
    expect(new Headers(result.headers).get("cache-control")).toBe(
      DEFAULT_LOCALIZATION_CACHE_CONTROL,
    );
  });

  it("supports a custom cache policy", async () => {
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers({
      ...HANDLER_CONFIG,
      cacheControl: "public, max-age=60",
    });

    const result = await handlers.get({ request: getRequest(), storefrontClient: client });

    if (result.type !== "json") throw new Error("expected json result");
    expect(new Headers(result.headers).get("cache-control")).toBe("public, max-age=60");
  });

  it("forwards locale query params to @inContext variables", async () => {
    const { client, graphql } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    await handlers.get({
      request: getRequest("?country=ca&language=fr"),
      storefrontClient: client,
    });

    expect(graphql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { country: "CA", language: "FR" } }),
    );
  });

  it("rejects invalid locale query params", async () => {
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.get({
      request: getRequest("?country=narnia"),
      storefrontClient: client,
    });

    expect(result.type).toBe("error");
    if (result.type !== "error") return;
    expect(result.error.code).toBe("invalid_localization_request");
  });

  it("intersects available countries and languages with supportedLocales", async () => {
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers({
      ...HANDLER_CONFIG,
      supportedLocales: [
        { country: "US", language: "EN" },
        { country: "CA", language: "FR" },
      ],
    });

    const result = await handlers.get({ request: getRequest(), storefrontClient: client });

    if (result.type !== "json") throw new Error("expected json result");
    const countries = result.data.availableCountries;
    expect(countries.map((country) => country.isoCode)).toEqual(["CA", "US"]);
    const canada = countries.find((country) => country.isoCode === "CA");
    expect(canada?.availableLanguages.map((language) => language.isoCode)).toEqual(["FR"]);
  });

  it("warns when live markets data drifts beyond supportedLocales", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const { client } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers({
      ...HANDLER_CONFIG,
      supportedLocales: [{ country: "US", language: "EN" }],
    });

    await handlers.get({ request: getRequest(), storefrontClient: client });

    expect(logger.warn).toHaveBeenCalledWith(
      "live markets data includes locales missing from supportedLocales",
      expect.objectContaining({ scope: "localization", countries: ["CA", "DE"] }),
    );
  });

  it("returns a structured error when the localization query fails", async () => {
    const { client } = mockStorefrontClient({ errors: [{ message: "boom" }] });
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.get({ request: getRequest(), storefrontClient: client });

    expect(result.type).toBe("error");
    if (result.type !== "error") return;
    expect(result.error.code).toBe("localization_request_failed");
    expect(result.status).toBe(500);
  });
});

describe("localization POST handler", () => {
  it("redirects to the localized equivalent of redirectTo", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(
        postRequest({
          country: "CA",
          language: "FR",
          redirectTo: "/collections/shoes?sort=price",
        }),
      ),
    );

    expect(result).toMatchObject({
      type: "redirect",
      location: "/fr-ca/collections/shoes?sort=price",
    });
  });

  it("strips the source locale prefix from redirectTo before applying the target", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(
        postRequest({ country: "DE", language: "DE", redirectTo: "/fr-ca/products/snowboard" }),
      ),
    );

    expect(result).toMatchObject({ type: "redirect", location: "/de-de/products/snowboard" });
  });

  it("redirects to the unprefixed path when the target is the default locale", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "US", redirectTo: "/fr-ca/products/snowboard" })),
    );

    expect(result).toMatchObject({ type: "redirect", location: "/products/snowboard" });
  });

  it("falls back to the root for cross-origin redirectTo values", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(
        postRequest({ country: "CA", language: "FR", redirectTo: "https://evil.example/x" }),
      ),
    );

    expect(result).toMatchObject({ type: "redirect", location: "/fr-ca" });
  });

  it("keeps the redirectTo language when language is omitted", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", redirectTo: "/fr-ca/products" })),
    );

    // Buyer was browsing in FR; FR is available in Canada, so it is kept.
    expect(result).toMatchObject({ type: "redirect", location: "/fr-ca/products" });
  });

  it("falls back to the country's first available language when the current one is unavailable", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "DE", redirectTo: "/fr-ca/products" })),
    );

    expect(result).toMatchObject({ type: "redirect", location: "/de-de/products" });
  });

  it("writes the selection to the session and merges commit headers", async () => {
    const sessionManager = mockSessionManager();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }), { sessionManager }),
    );

    expect(sessionManager.setSessionItem).toHaveBeenCalledWith(LOCALIZATION_SESSION_KEY, {
      country: "CA",
      language: "FR",
    });
    if (result.type !== "redirect") throw new Error("expected redirect result");
    expect(new Headers(result.headers).get("set-cookie")).toBe("session=updated");
  });

  it("still redirects when the session write fails", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const sessionManager = mockSessionManager({
      setSessionItem: vi.fn(() => {
        throw new Error("session unavailable");
      }),
    });
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }), { sessionManager }),
    );

    expect(result.type).toBe("redirect");
    expect(logger.error).toHaveBeenCalledWith(
      "locale session write failed",
      expect.objectContaining({ scope: "localization" }),
    );
  });

  it("updates the cart buyer identity when a cart cookie exists", async () => {
    const { client, graphql } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }, { cookie: "cart=abc123" }), {
        client,
      }),
    );

    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining("cartBuyerIdentityUpdate"),
      expect.objectContaining({
        variables: expect.objectContaining({ buyerIdentity: { countryCode: "CA" } }),
      }),
    );
  });

  it("skips the cart mutation when no cart cookie exists", async () => {
    const { client, graphql } = mockStorefrontClient();
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    await handlers.post(postContext(postRequest({ country: "CA", language: "FR" }), { client }));

    const cartCalls = graphql.mock.calls.filter(([document]) =>
      String(document).includes("cartBuyerIdentityUpdate"),
    );
    expect(cartCalls).toHaveLength(0);
  });

  it("still redirects when the cart sync fails", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const { client } = mockStorefrontClient({ cartError: new Error("cart offline") });
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }, { cookie: "cart=abc123" }), {
        client,
      }),
    );

    expect(result.type).toBe("redirect");
    expect(logger.error).toHaveBeenCalledWith(
      "cart buyer identity locale sync failed",
      expect.objectContaining({ scope: "localization" }),
    );
  });

  it("still redirects when the cart sync returns user errors", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const { client } = mockStorefrontClient({ cartUserErrors: [{ message: "invalid cart" }] });
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }, { cookie: "cart=abc123" }), {
        client,
      }),
    );

    expect(result.type).toBe("redirect");
    expect(logger.error).toHaveBeenCalled();
  });

  it("rejects a missing country field", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(postContext(postRequest({ language: "FR" })));

    expect(result.type).toBe("error");
    if (result.type !== "error") return;
    expect(result.error.code).toBe("invalid_localization_request");
  });

  it("rejects an unknown country code", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(postContext(postRequest({ country: "QQ" })));

    expect(result.type).toBe("error");
  });

  it("rejects a country the live markets data does not offer", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(postContext(postRequest({ country: "JP" })));

    expect(result.type).toBe("error");
    if (result.type !== "error") return;
    expect(result.error.message).toMatch(/not available/i);
  });

  it("rejects a language the target country does not offer", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(postContext(postRequest({ country: "DE", language: "FR" })));

    expect(result.type).toBe("error");
  });

  it("rejects locales outside supportedLocales in strict mode", async () => {
    const handlers = createLocalizationServerHandlers({
      ...HANDLER_CONFIG,
      supportedLocales: [
        { country: "US", language: "EN" },
        { country: "CA", language: "EN" },
      ],
    });

    const result = await handlers.post(postContext(postRequest({ country: "CA", language: "FR" })));

    expect(result.type).toBe("error");
  });

  it("rejects unparservable form bodies", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);
    const request = new Request(`https://store.example${LOCALIZATION_API_PATH}`, {
      method: "POST",
      body: JSON.stringify({ country: "CA" }),
      headers: { "content-type": "application/json" },
    });

    const result = await handlers.post(postContext(request));

    expect(result.type).toBe("error");
  });

  it("returns a structured failure when the live validation query fails", async () => {
    const { client } = mockStorefrontClient({ errors: [{ message: "boom" }] });
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "CA", language: "FR" }), { client }),
    );

    expect(result.type).toBe("error");
    if (result.type !== "error") return;
    expect(result.error.code).toBe("localization_request_failed");
    expect(result.status).toBe(500);
  });

  it("accepts lowercase submitted codes", async () => {
    const handlers = createLocalizationServerHandlers(HANDLER_CONFIG);

    const result = await handlers.post(
      postContext(postRequest({ country: "ca", language: "fr", redirectTo: "/products" })),
    );

    expect(result).toMatchObject({ type: "redirect", location: "/fr-ca/products" });
  });
});
