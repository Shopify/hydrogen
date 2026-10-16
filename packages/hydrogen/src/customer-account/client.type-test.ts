import { describe, expectTypeOf, it } from "vitest";

import { createStorefrontClient } from "../client/client";
import { createShopifyRequestContext } from "../core/request-context";
import { gql as storefrontGql } from "../graphql";
import {
  createCustomerAccountClient,
  createCustomerSession,
  gql as customerAccountGql,
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
} from "./index";
import type * as CustomerAccountExports from "./index";
import type { CustomerAccountDocument } from "./index";

const storefront = createStorefrontClient({
  type: "public",
  requestContext: createShopifyRequestContext({
    request: new Request("https://example.com"),
    i18n: { country: "US", language: "EN" },
  }),
  config: {
    storeDomain: "test.myshopify.com",
  },
});

const customerAccount = createCustomerAccountClient({
  shopId: "123456789",
  requestContext: createShopifyRequestContext({
    request: new Request("https://example.com/account"),
    i18n: { country: "US", language: "EN" },
  }),
});
const customerAccountAccessToken = "customer-token";

const STOREFRONT_QUERY = storefrontGql(`query { shop { name } }`);
const CUSTOMER_QUERY = customerAccountGql(`query { customer { firstName } }`);
const CUSTOMER_ORDER_QUERY = customerAccountGql(`query Order($orderId: ID!) { order(id: $orderId) { id } }`);
const CUSTOMER_LANGUAGE_QUERY = customerAccountGql(
  `query CustomerDetails($language: LanguageCode) @inContext(language: $language) { customer { id } }`,
);

describe("Customer Account API type boundary", () => {
  it("exposes OAuth session helpers separately from the GraphQL client", () => {
    const session = createCustomerSession({
      shopId: "123456789",
      customerAccountApiClientId: "shp_test-client-id",
    });

    type CustomerAccountModule = typeof CustomerAccountExports;
    type MissingExport<Name extends string> = Name extends keyof CustomerAccountModule
      ? never
      : true;

    expectTypeOf<MissingExport<"createCustomerAccountGql">>().toEqualTypeOf<true>();
    expectTypeOf(session).toHaveProperty("getOrRefreshAccessToken").toBeFunction();
    expectTypeOf(CUSTOMER_ACCOUNT_AUTHORIZE_PATH).toEqualTypeOf<"/account/authorize">();
    expectTypeOf(CUSTOMER_ACCOUNT_REFRESH_PATH).toEqualTypeOf<"/account/refresh">();
    expectTypeOf(customerAccount).not.toHaveProperty("getOrRefreshAccessToken");
  });

  it("returns an opaque Customer Account document", () => {
    expectTypeOf(CUSTOMER_QUERY).toMatchTypeOf<CustomerAccountDocument>();
    expectTypeOf(CUSTOMER_QUERY).not.toEqualTypeOf<string>();
  });

  it("accepts Customer Account documents on the Customer Account client", () => {
    const call = () => customerAccount.graphql(CUSTOMER_QUERY, { accessToken: customerAccountAccessToken });
    expectTypeOf(call).toBeFunction();
  });

  it("requires per-call access tokens", () => {
    const call = () => {
      // @ts-expect-error accessToken is required per request
      customerAccount.graphql(CUSTOMER_QUERY);
    };
    expectTypeOf(call).toBeFunction();
  });

  it("requires user-supplied Customer Account variables", () => {
    const call = () => {
      // @ts-expect-error orderId is required
      customerAccount.graphql(CUSTOMER_ORDER_QUERY, { accessToken: customerAccountAccessToken });

      customerAccount.graphql(CUSTOMER_ORDER_QUERY, {
        accessToken: customerAccountAccessToken,
        variables: { orderId: "gid://shopify/Order/1" },
      });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("does not require auto-filled language variables", () => {
    const call = () =>
      customerAccount.graphql(CUSTOMER_LANGUAGE_QUERY, { accessToken: customerAccountAccessToken });
    expectTypeOf(call).toBeFunction();
  });

  it("keeps caller values optional for LanguageCode language variables", () => {
    const REQUIRED_LANGUAGE_QUERY = customerAccountGql(
      `query CustomerDetails($language: LanguageCode!, $orderId: ID!) @inContext(language: $language) { order(id: $orderId) { id } }`,
    );
    const call = () => {
      customerAccount.graphql(REQUIRED_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        variables: { orderId: "gid://shopify/Order/1" },
      });
      customerAccount.graphql(REQUIRED_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        variables: { orderId: "gid://shopify/Order/1", language: "DE" },
      });
      customerAccount.graphql(REQUIRED_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        // @ts-expect-error language is a LanguageCode
        variables: { orderId: "gid://shopify/Order/1", language: "not-a-language" },
      });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("keeps language variables of other types caller-owned and required", () => {
    const STRING_LANGUAGE_QUERY = customerAccountGql(
      `query CustomerMetafield($language: String!) { customer { metafield(namespace: "custom", key: $language) { value } } }`,
    );
    const LIST_LANGUAGE_QUERY = customerAccountGql(
      `query CustomerDetails($language: [LanguageCode!]!) { customer { id } }`,
    );
    const call = () => {
      customerAccount.graphql(STRING_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        variables: { language: "promo-key" },
      });
      // @ts-expect-error language is a caller-owned String here
      customerAccount.graphql(STRING_LANGUAGE_QUERY, { accessToken: customerAccountAccessToken });
      customerAccount.graphql(STRING_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        // @ts-expect-error language is a String here
        variables: { language: 5 },
      });

      customerAccount.graphql(LIST_LANGUAGE_QUERY, {
        accessToken: customerAccountAccessToken,
        variables: { language: ["EN"] },
      });
      // @ts-expect-error a LanguageCode list is caller-owned
      customerAccount.graphql(LIST_LANGUAGE_QUERY, { accessToken: customerAccountAccessToken });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("matches the exact LanguageCode enum for documents without a source literal", () => {
    type Language =
      import("../graphql/generated/customer-account-graphql-env").introspection["types"]["LanguageCode"]["enumValues"];
    const LANGUAGE_DOC = null as unknown as CustomerAccountDocument<
      { customer: { id: string } },
      { language?: Language | null },
      string
    >;
    const STRING_DOC = null as unknown as CustomerAccountDocument<
      { customer: { id: string } },
      { language: string },
      string
    >;
    const call = () => {
      customerAccount.graphql(LANGUAGE_DOC, { accessToken: customerAccountAccessToken });
      customerAccount.graphql(STRING_DOC, {
        accessToken: customerAccountAccessToken,
        variables: { language: "promo-key" },
      });
      // @ts-expect-error language is a caller-owned String here
      customerAccount.graphql(STRING_DOC, { accessToken: customerAccountAccessToken });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("requires requestContext from the Shopify request context factory", () => {
    const call = () => {
      const options = {
        shopId: "123456789",
        request: new Request("https://example.com/account"),
      };

      // @ts-expect-error pass createShopifyRequestContext({request, i18n}) instead
      createCustomerAccountClient(options);
    };
    expectTypeOf(call).toBeFunction();
  });

  it("rejects plain requestContext objects", () => {
    const call = () => {
      createCustomerAccountClient({
        shopId: "123456789",
        // @ts-expect-error requestContext must come from createShopifyRequestContext()
        requestContext: {
          url: "https://example.com/account",
          signal: new AbortController().signal,
          i18n: { country: "US", language: "EN", pathPrefix: "" },
        },
      });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("rejects raw strings on the Customer Account client", () => {
    const call = () => {
      // @ts-expect-error raw strings must go through CAAPI.gql()
      customerAccount.graphql(`query { customer { firstName } }`, {
        accessToken: customerAccountAccessToken,
      });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("rejects Storefront documents on the Customer Account client", () => {
    const call = () => {
      // @ts-expect-error Storefront documents cannot run through the CAAPI client
      customerAccount.graphql(STOREFRONT_QUERY, { accessToken: customerAccountAccessToken });
    };
    expectTypeOf(call).toBeFunction();
  });

  it("rejects Customer Account documents on the Storefront client", () => {
    const call = () => {
      // @ts-expect-error Customer Account documents cannot run through the SFAPI client
      storefront.graphql(CUSTOMER_QUERY);
    };
    expectTypeOf(call).toBeFunction();
  });
});
