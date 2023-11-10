// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);
export const getSchema = () =>
  require.resolve('@shopify/hydrogen-react/storefront.schema.json');

let staticSchema = '';

try {
  staticSchema = getSchema();
} catch (error) {
  // This can happen at build time or when '@shopify/hydrogen-react' is not found.
  // Generally this shouldn't be an issue in real apps so let's ignore the error.
  // Also, this package could be used in non-Hydrogen apps.
}

export const schema = staticSchema;
