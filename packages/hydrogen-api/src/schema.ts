import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

export type SchemaApi = 'storefront' | 'customer-account';
type Options<T extends boolean> = {throwIfMissing?: T};

/**
 * Resolves the filesystem path of a GraphQL introspection schema bundled
 * with this package. Intended for wiring `graphql-codegen`'s `schema:`
 * field without depending on `@shopify/hydrogen-codegen` just to locate
 * the schema.
 *
 * Resolution: `new URL('./generated/<api>.schema.json', import.meta.url)`
 * works both against the source tree (`src/generated/`) and the built
 * output (`dist/generated/`) because `tsdown.config.ts` copies
 * `src/generated/*` to `dist/generated/*`.
 *
 * Node-only. `fileURLToPath` rejects non-`file:` URLs, so this is not
 * safe to call from worker/browser bundles or Yarn PnP setups.
 */
export function getSchema(api: SchemaApi, options?: Options<true>): string;
export function getSchema(
  api: SchemaApi,
  options: Options<false>,
): string | undefined;
export function getSchema(
  api: SchemaApi,
  options?: Options<boolean>,
): string | undefined {
  if (api !== 'storefront' && api !== 'customer-account') {
    throw new Error(
      `The provided API type "${api}" is unknown. Please use "storefront" or "customer-account".`,
    );
  }

  const here = fileURLToPath(new URL('.', import.meta.url));
  const path = join(here, 'generated', `${api}.schema.json`);

  if (!existsSync(path)) {
    if (options?.throwIfMissing === false) return undefined;
    throw new Error(
      `Could not find the "${api}" schema at ${path}. The \`@shopify/hydrogen-api\` install may be corrupt.`,
    );
  }

  return path;
}
