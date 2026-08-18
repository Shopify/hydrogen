import { describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { fetchLocalization, queryLocalization } from "./get-localization";
import { localizationQueries, makeLocalizationQueries } from "./queries";

const MOCK_LOCALIZATION = {
  country: {
    isoCode: "US",
    name: "United States",
    currency: { isoCode: "USD", symbol: "$" },
    availableLanguages: [{ isoCode: "EN", endonymName: "English", name: "English" }],
  },
  language: { isoCode: "EN", endonymName: "English", name: "English" },
  market: { handle: "us" },
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
  ],
};

type MockClientOptions = {
  errors?: Array<{ message: string }>;
  headers?: Headers;
};

function mockStorefrontClient(data: unknown, options: MockClientOptions = {}) {
  const graphql = vi.fn().mockResolvedValue({
    data,
    ...(options.errors && { errors: options.errors }),
    headers: options.headers ?? new Headers(),
  });
  return {
    client: { graphql } as unknown as Pick<StorefrontClient, "graphql">,
    graphql,
  };
}

describe("queryLocalization", () => {
  it("returns the localization data", async () => {
    const { client } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });

    await expect(queryLocalization({ storefrontClient: client })).resolves.toEqual(
      MOCK_LOCALIZATION,
    );
  });

  it("queries with the default localization document", async () => {
    const { client, graphql } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });

    await queryLocalization({ storefrontClient: client });

    expect(graphql).toHaveBeenCalledWith(localizationQueries.localization, expect.any(Object));
  });

  it("uses a custom query when provided", async () => {
    const { client, graphql } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });
    const customQueries = makeLocalizationQueries();

    await queryLocalization({ storefrontClient: client, query: customQueries.localization });

    expect(graphql).toHaveBeenCalledWith(customQueries.localization, expect.any(Object));
  });

  it("passes explicit locale overrides as @inContext variables", async () => {
    const { client, graphql } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });

    await queryLocalization({ storefrontClient: client, country: "CA", language: "FR" });

    expect(graphql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { country: "CA", language: "FR" } }),
    );
  });

  it("omits the variables object when no locale overrides are provided", async () => {
    const { client, graphql } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });

    await queryLocalization({ storefrontClient: client });

    expect(graphql).toHaveBeenCalledWith(expect.anything(), {});
  });

  it("forwards the abort signal", async () => {
    const { client, graphql } = mockStorefrontClient({ localization: MOCK_LOCALIZATION });
    const controller = new AbortController();

    await queryLocalization({ storefrontClient: client, signal: controller.signal });

    expect(graphql).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("throws on GraphQL errors", async () => {
    const { client } = mockStorefrontClient(null, {
      errors: [{ message: "boom" }, { message: "bust" }],
    });

    await expect(queryLocalization({ storefrontClient: client })).rejects.toThrow(
      /Shopify API errors: boom, bust/,
    );
  });

  it("throws when no localization data is returned", async () => {
    const { client } = mockStorefrontClient({ localization: null });

    await expect(queryLocalization({ storefrontClient: client })).rejects.toThrow(
      /No localization data/,
    );
  });
});

describe("fetchLocalization", () => {
  it("returns data and response headers", async () => {
    const headers = new Headers({ "x-request-id": "abc" });
    const { client } = mockStorefrontClient({ localization: MOCK_LOCALIZATION }, { headers });

    const result = await fetchLocalization({ storefrontClient: client });

    expect(result.data).toEqual(MOCK_LOCALIZATION);
    expect(result.headers.get("x-request-id")).toBe("abc");
  });
});
