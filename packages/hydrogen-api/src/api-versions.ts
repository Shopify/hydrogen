/**
 * Single source of truth for the Shopify API versions this package
 * generates types against. Imported by `codegen.ts` (the writer) and by
 * `generated-files.test.ts` (the verifier that ensures the checked-in
 * generated files were produced against these same versions).
 *
 * Bumping a version here without running `pnpm graphql-types` will cause
 * `pnpm test` to fail.
 */
export const SF_API_VERSION = '2026-04';
export const CA_API_VERSION = '2026-04';
