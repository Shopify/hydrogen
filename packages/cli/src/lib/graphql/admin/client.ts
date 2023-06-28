import {
  graphqlRequest,
  type GraphQLVariables,
} from '@shopify/cli-kit/node/api/graphql';
import type {AdminSession} from '../../auth.js';

export type {AdminSession};

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
  return graphqlRequest({query, api, url, token: session.token, variables});
}
