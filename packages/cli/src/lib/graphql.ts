import {graphqlRequest} from '@shopify/cli-kit/node/api/graphql';
import type {GraphQLVariables} from '@shopify/cli-kit/node/api/graphql';
import type {AdminSession} from '@shopify/cli-kit/node/session';
import {AbortError} from '@shopify/cli-kit/node/error';

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

const GID_REGEXP = /gid:\/\/shopify\/\w*\/(\d+)/;
/**
 * @param gid a Global ID to parse (e.g. 'gid://shopify/HydrogenStorefront/1')
 * @returns the ID of the record (e.g. '1')
 */
export function parseGid(gid: string): string {
  const matches = GID_REGEXP.exec(gid);
  if (matches && matches[1] !== undefined) {
    return matches[1];
  }
  throw new AbortError(`Invalid Global ID: ${gid}`);
}
