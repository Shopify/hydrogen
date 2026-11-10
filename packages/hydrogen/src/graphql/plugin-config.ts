import { join } from "node:path";

const STOREFRONT_SCHEMA_FILE_NAME = "storefront.schema.json";
const CUSTOMER_ACCOUNT_SCHEMA_FILE_NAME = "customer-account.schema.json";
const STOREFRONT_OUTPUT_FILE_NAME = "storefront-graphql-env.d.ts";
const CUSTOMER_ACCOUNT_OUTPUT_FILE_NAME = "customer-account-graphql-env.d.ts";

export function createGraphQLPluginConfig(schemaDirectory: string) {
  return {
    name: "gql.tada/ts-plugin",
    schemas: [
      {
        name: "storefront",
        schema: join(schemaDirectory, STOREFRONT_SCHEMA_FILE_NAME),
        tadaOutputLocation: STOREFRONT_OUTPUT_FILE_NAME,
      },
      {
        name: "customer-account",
        schema: join(schemaDirectory, CUSTOMER_ACCOUNT_SCHEMA_FILE_NAME),
        tadaOutputLocation: CUSTOMER_ACCOUNT_OUTPUT_FILE_NAME,
      },
    ],
    trackFieldUsage: false,
  } as const;
}
