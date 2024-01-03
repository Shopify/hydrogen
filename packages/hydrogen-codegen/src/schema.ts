// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);

/**
 * Resolves a schema path for the provided API type. Only the API types currently
 * bundled in Hydrogen are allowed: "storefront" and "customer".
 * @param api
 * @returns
 */
export const getSchema = (api = 'storefront' as 'storefront' | 'customer') => {
  if (api !== 'storefront' && api !== 'customer') {
    throw new Error(
      `The provided API type "${api}" is unknown. Please use "storefront" or "customer".`,
    );
  }

  return require.resolve(`@shopify/hydrogen-react/${api}.schema.json`);
};

let staticSFAPISchema = '';

try {
  staticSFAPISchema = getSchema('storefront');
} catch (error) {
  // This can happen at build time or when '@shopify/hydrogen-react' is not found.
  // Generally this shouldn't be an issue in real apps so let's ignore the error.
  // Also, this package could be used in non-Hydrogen apps.
}

/**
 * The resolved schema path for the Storefront API.
 */
export const schema = staticSFAPISchema;
