// This comment is used during ESM build:
//! import {createRequire} from 'module'; const require = createRequire(import.meta.url);

/**
 * Resolves a schema path for the provided API type. Only the API types currently
 * bundled in Hydrogen are allowed: "storefront" and "customer".
 * @param api
 * @returns
 */
export const getSchema = (api: 'storefront' | 'customer-account') => {
  if (api !== 'storefront' && api !== 'customer-account') {
    throw new Error(
      `The provided API type "${api}" is unknown. Please use "storefront" or "customer-account".`,
    );
  }

  return require.resolve(`@shopify/hydrogen-react/${api}.schema.json`);
};
