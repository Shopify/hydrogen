import {businessPlatformRequest} from '@shopify/cli-kit/node/api/business-platform';
import {AbortError} from '@shopify/cli-kit/node/error';

const CurrentUserAccountQuery = `#graphql
  query currentUserAccount {
    currentUserAccount {
      email
      organizations(first: 100) {
        edges {
          node {
            id
            name
            categories(handles: STORES) {
              destinations(first: 100) {
                edges {
                  node {
                    ...destinationFields
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      orphanDestinations {
        categories(handles: STORES) {
          destinations(first: 100) {
            edges {
              node {
                ...destinationFields
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    }
  }

  fragment destinationFields on Destination {
    name
    status
    webUrl
  }
`;

interface PageInfo {
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
}

interface Destination {
  name: string;
  status: string;
  webUrl: string;
}

type NodeCollection<T, U = {}> = U & {
  edges: Array<{node: T}>;
};

interface CurrentUserAccount {
  email: string;
  organizations: NodeCollection<
    {
      id: string;
      name: string;
      categories: Array<{
        destinations: NodeCollection<Destination, PageInfo>;
      }>;
    },
    PageInfo
  >;
  orphanDestinations: {
    categories: Array<{
      destinations: NodeCollection<Destination, PageInfo>;
    }>;
  };
}

export interface UserAccountSchema {
  currentUserAccount: CurrentUserAccount | null;
}

export async function getUserAccount(token: string) {
  const {currentUserAccount} = await businessPlatformRequest<UserAccountSchema>(
    CurrentUserAccountQuery,
    token,
  );

  if (!currentUserAccount) {
    throw new AbortError('Unable to get current user account');
  }

  return {
    email: currentUserAccount.email,
    activeShops: [
      ...(currentUserAccount.organizations?.edges?.flatMap((edge) =>
        edge.node?.categories.flatMap((category) =>
          category?.destinations?.edges?.map((edge) => edge.node),
        ),
      ) ?? []),
      ...(currentUserAccount.orphanDestinations?.categories?.flatMap(
        (category) => category.destinations?.edges?.map((edge) => edge.node),
      ) ?? []),
    ]
      .filter(({status}) => status === 'ACTIVE')
      .map(({name, webUrl}) => ({
        name,
        fqdn: webUrl.replace(/^https?:\/\//, '').replace(/\/admin$/, ''),
      })),
  };
}
