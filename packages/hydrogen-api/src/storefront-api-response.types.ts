import type {FormattedExecutionResult} from './codegen-types.js';

type StorefrontApiExtensions = {
  code?:
    | 'THROTTLED'
    | 'ACCESS_DENIED'
    | 'SHOP_INACTIVE'
    | 'INTERNAL_SERVER_ERROR'
    | (string & {});
};

/**
 * The Storefront API can return a 200 OK response code when the query succeeds,
 * populating the `data` property. It can also return errors in the `errors` property.
 * Refer to https://shopify.dev/api/storefront#status_and_error_codes for more information.
 */
export type StorefrontApiResponseOk<DataGeneric> = FormattedExecutionResult<
  DataGeneric,
  StorefrontApiExtensions
>;

/**
 * Non-200 error responses from the Storefront API.
 * Commonly a JSON-parseable string, but may occasionally return HTML.
 */
export type StorefrontApiResponseError =
  | string
  | {errors: {query: string}}
  | {errors: string};
