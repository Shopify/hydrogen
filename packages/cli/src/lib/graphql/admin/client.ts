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
  const response: Promise<T> = graphqlRequest({
    query,
    api,
    url,
    token: session.token,
    variables,
  });

  try {
    return await response;
  } catch (error: any) {
    const errors: GraphqlError[] = error.errors;

    if (
      errors.some((error) => error.message.includes('app is not installed'))
    ) {
      throw new AbortError(
        "Hydrogen sales channel isn't installed",
        'Install the Hydrogen sales channel on your store to start creating and linking Hydrogen storefronts: https://apps.shopify.com/hydrogen',
      );
    }

    throw error;
  }
}
