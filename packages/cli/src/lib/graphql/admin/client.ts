import {AbortError} from '@shopify/cli-kit/node/error';
import {
  graphqlRequest,
  type GraphQLVariables,
} from '@shopify/cli-kit/node/api/graphql';
import type {AdminSession} from '../../auth.js';

export type {AdminSession};

interface GraphqlError {
  message: string;
  locations: string[];
  path: string[];
}

// TODO: Can we now use a stable version of the Admin API?
/**
 * This is a temporary workaround until cli-kit includes a way to specify
 * API versions for the Admin API because we need to target the unstable
 * branch for this early access phase.
 *
 * @param query - GraphQL query to execute.
 * @param session - Shopify admin session including token and Store FQDN.
 * @param variables - GraphQL variables to pass to the query.
 * @returns The response of the query of generic type <T>.
 */
export async function adminRequest<T>(
  query: string,
  session: AdminSession,
  variables?: GraphQLVariables,
): Promise<T> {
  const api = 'Admin';
  const url = `https://${session.storeFqdn}/admin/api/unstable/graphql.json`;

  try {
    return await graphqlRequest({
      query,
      api,
      url,
      token: session.token,
      variables,
    });
  } catch (error: any) {
    const errors: GraphqlError[] = error.errors;

    if (
      errors?.some?.((error) => error.message.includes('app is not installed'))
    ) {
      throw new AbortError(
        "Hydrogen sales channel isn't installed",
        'Install the Hydrogen sales channel on your store to start creating and linking Hydrogen storefronts: https://apps.shopify.com/hydrogen',
      );
    }

    if (
      errors?.some?.((error) =>
        error.message.includes(
          'Access denied for hydrogenStorefrontCreate field',
        ),
      )
    ) {
      throw new AbortError("Couldn't connect storefront to Shopify", [
        'Common reasons for this error include:',
        {
          list: {
            items: [
              "The Hydrogen sales channel isn't installed on the store.",
              "You don't have the required account permission to manage apps or channels.",
              "You're trying to connect to an ineligible store type (Trial, Development store)",
            ],
          },
        },
      ]);
    }

    throw error;
  }
}
