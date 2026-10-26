import {AbortError} from '@shopify/cli-kit/node/error';
import {
  graphqlRequest,
  type GraphQLVariables,
} from '@shopify/cli-kit/node/api/graphql';
import type {AdminSession} from '../../auth.js';
import {requestMode} from '@shopify/cli-kit/node/http';
import {abandonOnAbort} from '../../abort.js';

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
const KNOWN_USER_ERRORS: {
  pattern: string;
  abort: ConstructorParameters<typeof AbortError>;
}[] = [
  {
    pattern: 'app is not installed',
    abort: [
      "Hydrogen sales channel isn't installed",
      'Install the Hydrogen sales channel on your store to start creating and linking Hydrogen storefronts: https://apps.shopify.com/hydrogen',
    ],
  },
  {
    pattern: 'Access denied for hydrogenStorefrontCreate field',
    abort: [
      "Couldn't connect storefront to Shopify",
      [
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
      ],
    ],
  },
  {
    pattern: 'Access denied for hydrogenStorefronts field',
    abort: [
      "Couldn't access Hydrogen storefronts",
      [
        'Common reasons for this error include:',
        {
          list: {
            items: [
              "You don't have full access to apps or access to the Hydrogen channel.",
              "The Hydrogen sales channel isn't installed on the store.",
            ],
          },
        },
      ],
    ],
  },
];

export async function adminRequest<T>(
  query: string,
  session: AdminSession,
  variables?: GraphQLVariables,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  const api = 'Admin';
  const url = `https://${session.storeFqdn}/admin/api/unstable/graphql.json`;
  const behaviour = requestMode('default');

  try {
    return await abandonOnAbort(
      () =>
        graphqlRequest<T>({
          query,
          api,
          url,
          token: session.token,
          variables,
          preferredBehaviour: signal
            ? {
                ...behaviour,
                useAbortSignal: () => {
                  signal.throwIfAborted();
                  return behaviour.useAbortSignal === true
                    ? AbortSignal.any([
                        signal,
                        AbortSignal.timeout(behaviour.timeoutMs),
                      ])
                    : signal;
                },
              }
            : undefined,
        }),
      signal,
    );
  } catch (error: any) {
    signal?.throwIfAborted();
    const errors: GraphqlError[] = error.errors;

    for (const {pattern, abort} of KNOWN_USER_ERRORS) {
      if (errors?.some?.((e) => e.message.includes(pattern))) {
        throw new AbortError(...abort);
      }
    }

    throw error;
  }
}
