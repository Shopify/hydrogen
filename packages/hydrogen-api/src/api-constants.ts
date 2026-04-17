/**
 * Single source of truth for the Shopify API versions this package
 * is built against. Exported at runtime (consumed by the client, the
 * codegen config, and the generated-files guard test) and re-exported
 * from `@shopify/hydrogen-api`'s main entry.
 *
 * If you bump a version here, make sure to run `pnpm graphql-types` to
 * regenerate the generated files.
 */
export const SFAPI_VERSION = '2026-04';
export const CAAPI_VERSION = '2026-04';
