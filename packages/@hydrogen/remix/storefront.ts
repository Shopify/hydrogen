import {
  createStorefrontClient as createStorefrontUtilities,
  type StorefrontApiResponseOk,
} from '@shopify/hydrogen-ui-alpha';
import type {ExecutionArgs} from 'graphql';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type StorefrontClientProps = Parameters<
  typeof createStorefrontUtilities
>[0];

export type Storefront = ReturnType<typeof createStorefrontClient>;

export type HydrogenContext = {
  storefront: Storefront;
  [key: string]: unknown;
};

export function createStorefrontClient(clientOptions: StorefrontClientProps) {
  const utils = createStorefrontUtilities(clientOptions);
  const {getPublicTokenHeaders, getStorefrontApiUrl} = utils;

  async function getStorefrontData<T>({
    query,
    variables,
  }: {
    query: string;
    variables: ExecutionArgs['variableValues'];
  }): Promise<T> {
    const headers = getPublicTokenHeaders();
    // This needs to be application/json because we're sending JSON, not a graphql string
    headers['content-type'] = 'application/json';

    const response = await fetch(getStorefrontApiUrl(), {
      body: JSON.stringify({
        query,
        variables,
      }),
      headers,
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();

      /**
       * The Storefront API might return a string error, or a JSON-formatted {error: string}.
       * We try both and conform them to a single {errors} format.
       */
      try {
        throwError(response, JSON.parse(error));
      } catch (_e) {
        throwError(response, [{message: error}]);
      }
    }

    const {data, errors} = (await response.json()) as StorefrontApiResponse<T>;

    if (errors) throwError(response, errors);

    return data as T;
  }

  return {
    ...utils,
    query: getStorefrontData,
  };
}

function throwError<T>(
  response: Response,
  errors: StorefrontApiResponse<T>['errors'],
) {
  if (errors) {
    const errorMessages =
      typeof errors === 'string'
        ? errors
        : errors.map((error) => error.message).join('\n');

    throw new Error(errorMessages);
  }

  throw new Error(`API response error: ${response.status}`);
}
