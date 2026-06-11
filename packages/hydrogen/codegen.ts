import type { CodegenConfig } from "@graphql-codegen/cli";

const SCHEMA_PATH = "./src/graphql/generated/storefront.schema.graphql";

const config: CodegenConfig = {
  schema: SCHEMA_PATH,
  generates: {
    "./src/graphql/generated/storefront-api-types.d.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        defaultScalarType: "string",
        useTypeImports: true,
        scalars: {
          Color: "string",
          DateTime: "string",
          Decimal: "string",
          HTML: "string",
          JSON: "string",
          URL: "string",
          UnsignedInt64: "string",
        },
      },
    },
    "./src/graphql/generated/storefront.schema.json": {
      plugins: ["introspection"],
      config: {
        minify: false,
      },
    },
  },
};

export default config;
