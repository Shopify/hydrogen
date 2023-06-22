import {businessPlatformRequest} from '@shopify/cli-kit/node/api/business-platform';

const CurrentUserAccountQuery = `#graphql
  query currentUserAccount {
    currentUserAccount {
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
    # shortName
    status
    # publicId
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
  // shortName: string;
  status: string;
  // publicId: string;
  webUrl: string;
}

type NodeCollection<T, U = {}> = U & {
  edges: Array<{node: T}>;
};

interface CurrentUserAccount {
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

export async function getActiveShops(token: string) {
  const {currentUserAccount} = await businessPlatformRequest<UserAccountSchema>(
    CurrentUserAccountQuery,
    token,
  );

  return [
    ...(currentUserAccount?.organizations?.edges?.flatMap((edge) =>
      edge.node?.categories.flatMap((category) =>
        category?.destinations?.edges?.map((edge) => edge.node),
      ),
    ) ?? []),
    ...(currentUserAccount?.orphanDestinations?.categories?.flatMap(
      (category) => category.destinations?.edges?.map((edge) => edge.node),
    ) ?? []),
  ]
    .filter(({status}) => status === 'ACTIVE')
    .map(({name, webUrl}) => ({
      name,
      fqdn: webUrl.replace(/^https?:\/\//, '').replace(/\/admin$/, ''),
    }));
}
