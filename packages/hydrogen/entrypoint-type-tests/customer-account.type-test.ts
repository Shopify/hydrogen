import { describe, expectTypeOf, it } from "vitest";

import { createShopifyRequestContext } from "@shopify/hydrogen";
import * as CAAPI from "@shopify/hydrogen/customer-account";
import type { LanguageCode as CustomerAccountLanguageCode } from "@shopify/hydrogen/customer-account-api-types";

type CustomerAccountClientLanguageCode = Parameters<
  typeof CAAPI.createCustomerAccountClient
>[0]["requestContext"]["i18n"]["language"];

const requestContext = createShopifyRequestContext({
  request: new Request("https://example.com/account"),
  i18n: { country: "US", language: "EN" },
});

describe("Customer Account public entrypoints", () => {
  it("accepts request contexts from the main Hydrogen entrypoint", () => {
    const customerAccount = CAAPI.createCustomerAccountClient({
      shopId: "123456789",
      requestContext,
    });

    expectTypeOf(customerAccount.graphql).toBeFunction();
  });

  it("uses a language code compatible with the Customer Account API schema", () => {
    expectTypeOf<CustomerAccountClientLanguageCode>().toEqualTypeOf<CustomerAccountLanguageCode>();
  });
});
