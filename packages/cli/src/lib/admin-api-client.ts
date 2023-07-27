type AdminAPIResponse = {
  errors: Error[] | null;
  data: object | null;
};

const defaultOptions = {variables: {}};

type DefaultOptions = {
  variables: Record<string, any> | undefined;
};

/**
 * A basic Admin API fetch-based client.
 */
export function createAdminClient({
  adminApiVersion,
  privateAdminToken,
  storeDomain,
}: {
  adminApiVersion: string;
  privateAdminToken: string;
  storeDomain: string;
}) {
  async function admin<T>(
    query: string | null,
    options?: DefaultOptions,
  ): Promise<T> {
    if (!query) {
      throw new Error('Must provide a `query` to the admin client');
    }

    const endpoint = `${storeDomain}/admin/api/${adminApiVersion}/graphql.json`;
    const reqInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': privateAdminToken,
      },
      body: JSON.stringify({
        query,
        variables: options?.variables || defaultOptions.variables,
      }),
    };

    const request = await fetch(endpoint, reqInit);

    if (!request.ok) {
      throw new Error(
        `graphql api request not ok ${request.status} ${request.statusText}`,
      );
    }

    const response: AdminAPIResponse = await request.json();

    if (response?.errors?.length) {
      throw new Error(response.errors[0].message);
    }

    return response.data as T;
  }

  return {admin};
}
