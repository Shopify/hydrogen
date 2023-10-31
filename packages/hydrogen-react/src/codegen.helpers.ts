/**
 * Meant to be used with GraphQL CodeGen to type the Storefront API's custom scalars correctly.
 * Reference for the GraphQL types: https://shopify.dev/docs/api/storefront/current/scalars/HTML
 * Note: JSON is generated as 'unknown' by default.
 */
export const storefrontApiCustomScalars = {
  // Keep in sync with the definitions in the app/nextjs/codegen.ts!
  DateTime: 'string',
  Decimal: 'string',
  HTML: 'string',
  URL: 'string',
  Color: 'string',
  UnsignedInt64: 'string',
};
