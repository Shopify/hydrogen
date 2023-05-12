// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);
export const schema = require.resolve(
  '@shopify/hydrogen/storefront.schema.json',
);
