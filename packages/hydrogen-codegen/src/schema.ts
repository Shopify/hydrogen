// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);
export const getSchema = () =>
  require.resolve('@shopify/hydrogen/storefront.schema.json');

let staticSchema = '';

try {
  staticSchema = getSchema();
} catch {
  // This can happen at build time or when '@shopify/hydrogen' is not found.
  // Generally this shouldn't be an issue in real apps so let's ignore the error.
}

export const schema = staticSchema;
