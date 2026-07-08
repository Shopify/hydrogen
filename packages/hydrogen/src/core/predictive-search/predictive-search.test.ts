import { describe, expect, it, vi } from "vitest";

import { gql } from "../../graphql";
import { createShopifyRouteTemplates } from "../standard-routes/index";
import {
  createPredictiveSearchFormRegister,
  DEFAULT_PREDICTIVE_SEARCH_LIMIT,
  getPredictiveSearchFormAttributes,
  MAX_PREDICTIVE_SEARCH_LIMIT,
  MIN_PREDICTIVE_SEARCH_LIMIT,
  fetchPredictiveSearch,
  getPredictiveSearchItemUrl,
  getSearchResultUrl,
  makePredictiveSearchQueries,
  predictiveSearchQueries,
  queryPredictiveSearch,
  readPredictiveSearchFormTerm,
} from "./index";
import { getEmptyPredictiveSearchResult } from "./search";

const mockItems = {
  products: [
    {
      __typename: "Product" as const,
      id: "gid://shopify/Product/1",
      handle: "snowboard",
      title: "Snowboard",
      trackingParameters: "_pos=1&_psq=snow&_ss=e&_v=1.0",
      selectedOrFirstAvailableVariant: null,
    },
  ],
  collections: [],
  pages: [],
  articles: [],
  queries: [
    {
      __typename: "SearchQuerySuggestion" as const,
      text: "snowboard",
      styledText: "<b>snow</b>board",
      trackingParameters: null,
    },
  ],
};

function createStorefrontClient(
  data: unknown,
  errors?: Array<{ message: string }>,
  headers = new Headers(),
) {
  return {
    graphql: vi.fn().mockResolvedValue({
      data,
      ...(errors ? { errors } : {}),
      headers,
    }),
  };
}

describe("getEmptyPredictiveSearchResult", () => {
  it("returns an isolated empty result for the supplied term", () => {
    const first = getEmptyPredictiveSearchResult("snow");
    const second = getEmptyPredictiveSearchResult("board");

    first.items.products.push(mockItems.products[0]);

    expect(first.term).toBe("snow");
    expect(second).toEqual({
      term: "board",
      total: 0,
      items: {
        products: [],
        collections: [],
        pages: [],
        articles: [],
        queries: [],
      },
    });
  });
});

describe("getPredictiveSearchItemUrl", () => {
  const term = "snow";
  const defaultRouteTemplates = createShopifyRouteTemplates({});

  it("builds standard resource routes from predictive search item types", () => {
    expect(
      getPredictiveSearchItemUrl(mockItems.products[0], { routes: defaultRouteTemplates, term }),
    ).toBe("/products/snowboard?q=snow&_pos=1&_psq=snow&_ss=e&_v=1.0");
    expect(
      getPredictiveSearchItemUrl(
        {
          __typename: "Collection",
          id: "gid://shopify/Collection/1",
          handle: "winter-gear",
          title: "Winter gear",
          image: null,
          trackingParameters: "_pos=2",
        },
        { routes: defaultRouteTemplates, term },
      ),
    ).toBe("/collections/winter-gear?q=snow&_pos=2");
    expect(
      getPredictiveSearchItemUrl(
        {
          __typename: "Page",
          id: "gid://shopify/Page/1",
          handle: "size-guide",
          title: "Size guide",
          trackingParameters: "_pos=3",
        },
        { routes: defaultRouteTemplates, term },
      ),
    ).toBe("/pages/size-guide?q=snow&_pos=3");
    expect(
      getPredictiveSearchItemUrl(
        {
          __typename: "Article",
          id: "gid://shopify/Article/1",
          handle: "waxing-guide",
          title: "Waxing guide",
          blog: { handle: "journal" },
          image: null,
          trackingParameters: "_pos=4",
        },
        { routes: defaultRouteTemplates, term },
      ),
    ).toBe("/blogs/journal/waxing-guide?q=snow&_pos=4");
  });

  it("uses query suggestion text and the default search path without extra options", () => {
    expect(getPredictiveSearchItemUrl(mockItems.queries[0])).toBe("/search?q=snowboard");
  });

  it("uses a configurable search path for query suggestions", () => {
    expect(getPredictiveSearchItemUrl(mockItems.queries[0], { searchPath: "/find" })).toBe(
      "/find?q=snowboard",
    );
  });

  it("uses standard route templates for resource routes", () => {
    const routeTemplates = createShopifyRouteTemplates({
      article: "/articles/:blogHandle/:articleHandle",
      product: "/p/:productHandle",
    });

    expect(
      getPredictiveSearchItemUrl(mockItems.products[0], {
        pathPrefix: "/fr-ca",
        term,
        routes: routeTemplates,
      }),
    ).toBe("/fr-ca/p/snowboard?q=snow&_pos=1&_psq=snow&_ss=e&_v=1.0");
    expect(
      getPredictiveSearchItemUrl(
        {
          __typename: "Article",
          id: "gid://shopify/Article/1",
          handle: "waxing-guide",
          title: "Waxing guide",
          blog: { handle: "journal" },
          image: null,
          trackingParameters: "_pos=4",
        },
        {
          term,
          routes: routeTemplates,
        },
      ),
    ).toBe("/articles/journal/waxing-guide?q=snow&_pos=4");
  });
});

describe("getSearchResultUrl", () => {
  it("encodes search terms exactly once", () => {
    expect(getSearchResultUrl({ baseUrl: "/search", term: "snow board" })).toBe(
      "/search?q=snow+board",
    );
  });

  it("preserves existing query params and hashes", () => {
    expect(
      getSearchResultUrl({
        baseUrl: "/products/snowboard?variant=1#details",
        term: "snow board",
        params: { color: "blue" },
      }),
    ).toBe("/products/snowboard?variant=1&color=blue&q=snow+board#details");
  });

  it("appends tracking params after app params", () => {
    expect(
      getSearchResultUrl({
        baseUrl: "/products/snowboard?q=old",
        term: "snow",
        trackingParameters: "q=tracked&_pos=1",
      }),
    ).toBe("/products/snowboard?q=snow&q=tracked&_pos=1");
  });

  it("supports a custom search param name", () => {
    expect(
      getSearchResultUrl({
        baseUrl: "/search",
        term: "snow",
        searchParamName: "query",
      }),
    ).toBe("/search?query=snow");
  });
});

describe("predictive search form helpers", () => {
  it("returns query input attributes from the form register", () => {
    const register = createPredictiveSearchFormRegister();

    expect(register("query")).toEqual({
      name: "q",
      type: "search",
      autoComplete: "off",
      autoCapitalize: "off",
      spellCheck: false,
    });
  });

  it("throws for unknown form fields", () => {
    const register = createPredictiveSearchFormRegister();

    expect(() => (register as (field: string) => unknown)("term")).toThrow(
      'Unknown predictive search form field: "term".',
    );
  });

  it("returns progressive enhancement form attributes", () => {
    expect(getPredictiveSearchFormAttributes()).toEqual({
      action: "/search",
      method: "get",
      role: "search",
    });
    expect(getPredictiveSearchFormAttributes("/find")).toEqual({
      action: "/find",
      method: "get",
      role: "search",
    });
  });

  it("reads the predictive search query field from form data", () => {
    const formData = new FormData();
    formData.set("q", "snow");

    expect(readPredictiveSearchFormTerm(formData)).toBe("snow");
  });

  it("returns an empty string when the query field is missing", () => {
    expect(readPredictiveSearchFormTerm(new FormData())).toBe("");
  });
});

describe("makePredictiveSearchQueries", () => {
  it("declares Storefront API context and predictive search options", () => {
    expect(predictiveSearchQueries.predictiveSearch).toContain("$country: CountryCode");
    expect(predictiveSearchQueries.predictiveSearch).toContain("$language: LanguageCode");
    expect(predictiveSearchQueries.predictiveSearch).toContain(
      "$searchableFields: [SearchableField!]",
    );
    expect(predictiveSearchQueries.predictiveSearch).toContain(
      "$unavailableProducts: SearchUnavailableProductsType",
    );
    expect(predictiveSearchQueries.predictiveSearch).toContain(
      "@inContext(country: $country, language: $language)",
    );
  });

  it("adds custom fragments without removing base fragments", () => {
    const customProductFragment = gql(`
      fragment PredictiveSearchProductFragment on Product {
        vendor
      }
    `);
    const queries = makePredictiveSearchQueries({
      fragments: { product: customProductFragment },
    });

    expect(queries.predictiveSearch).toContain("...HydrogenPredictiveSearchProductFragment");
    expect(queries.predictiveSearch).toContain("...PredictiveSearchProductFragment");
    expect(queries.predictiveSearch).toContain(
      "fragment PredictiveSearchProductFragment on Product",
    );
    expect(queries.predictiveSearch).toContain("vendor");
  });

  it("throws locally when custom fragments use the wrong name", () => {
    const wrongFragment = gql(`
      fragment WrongPredictiveSearchProductFragment on Product {
        vendor
      }
    `);

    expect(() => makePredictiveSearchQueries({ fragments: { product: wrongFragment } })).toThrow(
      "Predictive search product fragment must be named PredictiveSearchProductFragment",
    );
  });

  it("throws locally when custom fragments use the wrong type", () => {
    const wrongFragment = gql(`
      fragment PredictiveSearchProductFragment on Collection {
        title
      }
    `);

    expect(() => makePredictiveSearchQueries({ fragments: { product: wrongFragment } })).toThrow(
      "and target Product",
    );
  });
});

describe("queryPredictiveSearch", () => {
  it("returns only predictive search data", async () => {
    const storefrontClient = createStorefrontClient(
      { predictiveSearch: mockItems },
      undefined,
      new Headers({ "x-request-id": "123" }),
    );

    await expect(queryPredictiveSearch({ storefrontClient, term: "snow" })).resolves.toEqual({
      term: "snow",
      total: 2,
      items: mockItems,
    });
  });

  it("returns an empty result without a Storefront API request for empty terms", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: mockItems });

    await expect(queryPredictiveSearch({ storefrontClient, term: "   " })).resolves.toEqual(
      getEmptyPredictiveSearchResult(""),
    );
    expect(storefrontClient.graphql).not.toHaveBeenCalled();
  });

  it("queries Storefront API with safe defaults", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: mockItems });

    const result = await queryPredictiveSearch({ storefrontClient, term: " snow " });

    expect(storefrontClient.graphql).toHaveBeenCalledWith(
      predictiveSearchQueries.predictiveSearch,
      {
        variables: {
          limit: DEFAULT_PREDICTIVE_SEARCH_LIMIT,
          limitScope: "EACH",
          term: "snow",
          types: undefined,
          searchableFields: undefined,
          unavailableProducts: "HIDE",
        },
      },
    );
    expect(result.total).toBe(2);
    expect(result.items).toEqual(mockItems);
  });

  it("clamps limits to the Storefront API range", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: mockItems });

    await queryPredictiveSearch({ storefrontClient, term: "snow", limit: 100 });
    await queryPredictiveSearch({ storefrontClient, term: "snow", limit: -1 });

    expect(storefrontClient.graphql).toHaveBeenNthCalledWith(
      1,
      predictiveSearchQueries.predictiveSearch,
      {
        variables: expect.objectContaining({ limit: MAX_PREDICTIVE_SEARCH_LIMIT }),
      },
    );
    expect(storefrontClient.graphql).toHaveBeenNthCalledWith(
      2,
      predictiveSearchQueries.predictiveSearch,
      {
        variables: expect.objectContaining({ limit: MIN_PREDICTIVE_SEARCH_LIMIT }),
      },
    );
  });

  it("passes optional predictive search controls", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: mockItems });

    await queryPredictiveSearch({
      storefrontClient,
      term: "snow",
      limitScope: "ALL",
      types: ["PRODUCT", "QUERY"],
      searchableFields: ["TITLE", "TAG"],
      unavailableProducts: "LAST",
    });

    expect(storefrontClient.graphql).toHaveBeenCalledWith(
      predictiveSearchQueries.predictiveSearch,
      {
        variables: expect.objectContaining({
          limitScope: "ALL",
          types: ["PRODUCT", "QUERY"],
          searchableFields: ["TITLE", "TAG"],
          unavailableProducts: "LAST",
        }),
      },
    );
  });

  it("throws when Storefront API returns errors", async () => {
    const storefrontClient = createStorefrontClient(null, [{ message: "Nope" }]);

    await expect(queryPredictiveSearch({ storefrontClient, term: "snow" })).rejects.toThrow(
      "Shopify API errors: Nope",
    );
  });

  it("throws when Storefront API omits predictive search data", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: null });

    await expect(queryPredictiveSearch({ storefrontClient, term: "snow" })).rejects.toThrow(
      "No predictive search data returned from Shopify API",
    );
  });
});

describe("fetchPredictiveSearch", () => {
  it("returns predictive search data with Storefront API response headers", async () => {
    const headers = new Headers({ "x-request-id": "123" });
    const storefrontClient = createStorefrontClient(
      { predictiveSearch: mockItems },
      undefined,
      headers,
    );

    const result = await fetchPredictiveSearch({ storefrontClient, term: " snow " });

    expect(result.data).toEqual({
      term: "snow",
      total: 2,
      items: mockItems,
    });
    expect(result.headers).toBe(headers);
  });

  it("returns empty headers when empty terms skip Storefront API", async () => {
    const storefrontClient = createStorefrontClient({ predictiveSearch: mockItems });

    const result = await fetchPredictiveSearch({ storefrontClient, term: "   " });

    expect(result.data).toEqual(getEmptyPredictiveSearchResult(""));
    expect(result.headers).toEqual(new Headers());
    expect(storefrontClient.graphql).not.toHaveBeenCalled();
  });
});
