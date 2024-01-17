import {StorefrontApiErrors, StorefrontError} from "../../storefront";
import {CartQueryData, CartQueryDataReturnError} from "./cart-types";

export function formatError(data: CartQueryData, storefrontError?: StorefrontError) {
  const {userErrors, ...rest} = data;
  let combineError: CartQueryDataReturnError;
  if (userErrors || storefrontError?.errors) {
    combineError = {
      errors: storefrontError?.errors,
      userErrors,
    }
  }

  return {
    ...rest,
    error: combineError,
  };
}
