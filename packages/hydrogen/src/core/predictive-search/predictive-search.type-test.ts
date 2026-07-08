import { describe, expectTypeOf, it } from "vitest";
import type { ResultOf, VariablesOf } from "gql.tada";

import type { StorefrontClient } from "../../client";
import { gql } from "../../graphql";
import { createShopifyRouteTemplates } from "../standard-routes/index";
import type {
  PredictiveSearchDataForOptions,
  PredictiveSearchProductItem,
  PredictiveSearchQueryItem,
  predictiveSearchQueries,
} from "./index";
import { getPredictiveSearchItemUrl, makePredictiveSearchQueries } from "./index";
import { queryPredictiveSearch } from "./search";

const customProductFragment = gql(`
  fragment PredictiveSearchProductFragment on Product {
    vendor
    productType
  }
`);

const customCollectionFragment = gql(`
  fragment PredictiveSearchCollectionFragment on Collection {
    description
  }
`);

const customQueries = makePredictiveSearchQueries({
  fragments: {
    product: customProductFragment,
    collection: customCollectionFragment,
  },
});

describe("predictive search query result types", () => {
  it("default query exposes base predictive search fields", () => {
    type R = ResultOf<typeof predictiveSearchQueries.predictiveSearch>;
    type Product = NonNullable<R["predictiveSearch"]>["products"][number];
    type Query = NonNullable<R["predictiveSearch"]>["queries"][number];

    expectTypeOf<Product>().toHaveProperty("handle");
    expectTypeOf<Product>().toHaveProperty("trackingParameters");
    expectTypeOf<Product>().toHaveProperty("selectedOrFirstAvailableVariant");
    expectTypeOf<Query>().toHaveProperty("styledText");
  });

  it("custom fragments extend predictive search query types", () => {
    type R = ResultOf<typeof customQueries.predictiveSearch>;
    type Product = NonNullable<R["predictiveSearch"]>["products"][number];
    type Collection = NonNullable<R["predictiveSearch"]>["collections"][number];

    expectTypeOf<Product>().toHaveProperty("vendor");
    expectTypeOf<Product>().toHaveProperty("productType");
    expectTypeOf<Collection>().toHaveProperty("description");
  });

  it("resolves normalized data from handler options", () => {
    type Data = PredictiveSearchDataForOptions<{
      readonly fragments: {
        readonly product: typeof customProductFragment;
      };
    }>;
    type Product = Data["items"]["products"][number];

    expectTypeOf<Data>().toHaveProperty("term");
    expectTypeOf<Data>().toHaveProperty("total");
    expectTypeOf<Product>().toHaveProperty("vendor");
  });

  it("infers custom fragment fields from queryPredictiveSearch query option", async () => {
    const storefrontClient: Pick<StorefrontClient, "graphql"> = {
      graphql: (async () => ({
        data: {
          predictiveSearch: {
            products: [],
            collections: [],
            pages: [],
            articles: [],
            queries: [],
          },
        },
        headers: new Headers(),
      })) as Pick<StorefrontClient, "graphql">["graphql"],
    };

    const result = await queryPredictiveSearch({
      storefrontClient,
      term: "snow",
      query: customQueries.predictiveSearch,
    });

    type Product = (typeof result)["items"]["products"][number];
    type Collection = (typeof result)["items"]["collections"][number];

    expectTypeOf<Product>().toHaveProperty("vendor");
    expectTypeOf<Product>().toHaveProperty("productType");
    expectTypeOf<Collection>().toHaveProperty("description");
  });
});

describe("predictive search URL helper types", () => {
  it("allows query suggestions without extra options", () => {
    const query = {
      __typename: "SearchQuerySuggestion",
      text: "snowboard",
      styledText: "<b>snow</b>board",
      trackingParameters: null,
    } satisfies PredictiveSearchQueryItem;

    const url = getPredictiveSearchItemUrl(query);

    expectTypeOf(url).toBeString();
  });

  it("requires route templates and a search term for resource items", () => {
    const product = {
      __typename: "Product",
      id: "gid://shopify/Product/1",
      handle: "snowboard",
      title: "Snowboard",
      trackingParameters: null,
      selectedOrFirstAvailableVariant: null,
    } satisfies PredictiveSearchProductItem;

    const callWithoutTerm = () => {
      // @ts-expect-error Resource items need route templates and the typed search term.
      return getPredictiveSearchItemUrl(product);
    };
    const callWithoutRoutes = () => {
      // @ts-expect-error Resource items need route templates, even when the manifest is empty.
      return getPredictiveSearchItemUrl(product, { term: "snow" });
    };

    expectTypeOf(callWithoutTerm).toEqualTypeOf<() => string>();
    expectTypeOf(callWithoutRoutes).toEqualTypeOf<() => string>();
  });

  it("accepts standard route templates", () => {
    const product = {
      __typename: "Product",
      id: "gid://shopify/Product/1",
      handle: "snowboard",
      title: "Snowboard",
      trackingParameters: null,
      selectedOrFirstAvailableVariant: null,
    } satisfies PredictiveSearchProductItem;

    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    const url = getPredictiveSearchItemUrl(product, {
      pathPrefix: "/fr-ca",
      term: "snow",
      routes: routeTemplates,
    });

    expectTypeOf(url).toBeString();
  });

  it("rejects callback route overrides", () => {
    const product = {
      __typename: "Product",
      id: "gid://shopify/Product/1",
      handle: "snowboard",
      title: "Snowboard",
      trackingParameters: null,
      selectedOrFirstAvailableVariant: null,
    } satisfies PredictiveSearchProductItem;

    const callWithCallbackRoutes = () =>
      // @ts-expect-error Predictive search accepts route templates, not callbacks.
      getPredictiveSearchItemUrl(product, {
        term: "snow",
        routes: {
          product: () => "/shop/snowboard",
        },
      });

    expectTypeOf(callWithCallbackRoutes).toEqualTypeOf<() => string>();
  });
});

describe("predictive search query variable types", () => {
  it("requires term and supports Storefront predictive search controls", () => {
    type V = VariablesOf<typeof predictiveSearchQueries.predictiveSearch>;

    expectTypeOf<V>().toHaveProperty("term");
    expectTypeOf<V["term"]>().toBeString();
    expectTypeOf<V>().toHaveProperty("limit");
    expectTypeOf<V>().toHaveProperty("limitScope");
    expectTypeOf<V>().toHaveProperty("types");
    expectTypeOf<V>().toHaveProperty("searchableFields");
    expectTypeOf<V>().toHaveProperty("unavailableProducts");
  });
});
