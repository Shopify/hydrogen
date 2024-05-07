import { businessPlatformRequest } from '@shopify/cli-kit/node/api/business-platform';
import { AbortError } from '@shopify/cli-kit/node/error';

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
async function getUserAccount(token) {
  const { currentUserAccount } = await businessPlatformRequest(
    CurrentUserAccountQuery,
    token
  );
  if (!currentUserAccount) {
    throw new AbortError("Unable to get current user account");
  }
  return {
    email: currentUserAccount.email,
    activeShops: [
      ...currentUserAccount.organizations?.edges?.flatMap(
        (edge) => edge.node?.categories.flatMap(
          (category) => category?.destinations?.edges?.map((edge2) => edge2.node)
        )
      ) ?? [],
      ...currentUserAccount.orphanDestinations?.categories?.flatMap(
        (category) => category.destinations?.edges?.map((edge) => edge.node)
      ) ?? []
    ].filter(({ status }) => status === "ACTIVE").map(({ name, webUrl }) => ({
      name,
      fqdn: webUrl.replace(/^https?:\/\//, "").replace(/\/admin$/, "")
    }))
  };
}

export { getUserAccount };
