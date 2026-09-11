import type { CodegenConfig } from "@graphql-codegen/cli";

import { CUSTOMER_ACCOUNT_API_VERSION } from "./src/core/constants";
import { CUSTOMER_ACCOUNT_API_SCALARS, STOREFRONT_API_SCALARS } from "./src/graphql/scalars";

const STOREFRONT_SCHEMA_PATH = "./src/graphql/generated/storefront.schema.graphql";
// Public Hydrogen app identifier used only by Shopify's Customer Account schema introspection service.
const CUSTOMER_ACCOUNT_PUBLIC_INTROSPECTION_CLIENT_ID = "159a99b8a7289a72f68603f2f4de40ac";
const CUSTOMER_ACCOUNT_SCHEMA_URL = `https://app.myshopify.com/services/graphql/introspection/customer?api_client_api_key=${CUSTOMER_ACCOUNT_PUBLIC_INTROSPECTION_CLIENT_ID}&api_version=${CUSTOMER_ACCOUNT_API_VERSION}`;

const config: CodegenConfig = {
  generates: {
    "./src/graphql/generated/storefront-api-types.d.ts": {
      schema: STOREFRONT_SCHEMA_PATH,
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "string",
        useTypeImports: true,
        scalars: STOREFRONT_API_SCALARS,
      },
    },
    "./src/graphql/generated/storefront.schema.json": {
      schema: STOREFRONT_SCHEMA_PATH,
      plugins: ["introspection"],
      config: {
        minify: false,
      },
    },
    "./src/graphql/generated/customer-account-api-types.d.ts": {
      schema: {
        [CUSTOMER_ACCOUNT_SCHEMA_URL]: {
          method: "GET",
        },
      },
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "string",
        useTypeImports: true,
        scalars: CUSTOMER_ACCOUNT_API_SCALARS,
      },
    },
    "./src/graphql/generated/customer-account.schema.json": {
      schema: {
        [CUSTOMER_ACCOUNT_SCHEMA_URL]: {
          method: "GET",
        },
      },
      plugins: ["introspection"],
      config: {
        minify: false,
      },
    },
  },
};

export default config;
