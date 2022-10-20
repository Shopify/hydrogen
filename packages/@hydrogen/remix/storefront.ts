import {
  createStorefrontClient as createStorefrontUtilities,
  type StorefrontApiResponseOk,
} from '@shopify/hydrogen-ui-alpha';

type StorefrontApiResponse<T> = StorefrontApiResponseOk<T>;

export type StorefrontClientProps = Parameters<
  typeof createStorefrontUtilities
>[0];

export type Storefront = ReturnType<typeof createStorefrontClient>;

export type HydrogenContext = {
  storefront: Storefront;
  [key: string]: any;
};

export function createStorefrontClient(clientOptions: StorefrontClientProps) {
  const utils = createStorefrontUtilities(clientOptions);
  const {getPublicTokenHeaders, getStorefrontApiUrl} = utils;

  async function getStorefrontData<T>({
    query,
    variables,
  }: {
    query: string;
    variables: Record<string, any>;
  }): Promise<StorefrontApiResponse<T>> {
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
        return JSON.parse(error);
      } catch (_e) {
        return {errors: [{message: error}]};
      }
    }

    return response.json() as StorefrontApiResponseOk<T>;
  }

  return {
    ...utils,
    query: getStorefrontData,
  };
}
