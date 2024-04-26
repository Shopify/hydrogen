import { AbortError } from '@shopify/cli-kit/node/error';
import { graphqlRequest } from '@shopify/cli-kit/node/api/graphql';

async function adminRequest(query, session, variables) {
  const api = "Admin";
  const url = `https://${session.storeFqdn}/admin/api/unstable/graphql.json`;
  try {
    return await graphqlRequest({
      query,
      api,
      url,
      token: session.token,
      variables
    });
  } catch (error) {
    const errors = error.errors;
    if (errors?.some?.((error2) => error2.message.includes("app is not installed"))) {
      throw new AbortError(
        "Hydrogen sales channel isn't installed",
        "Install the Hydrogen sales channel on your store to start creating and linking Hydrogen storefronts: https://apps.shopify.com/hydrogen"
      );
    }
    if (errors?.some?.(
      (error2) => error2.message.includes(
        "Access denied for hydrogenStorefrontCreate field"
      )
    )) {
      throw new AbortError("Couldn't connect storefront to Shopify", [
        "Common reasons for this error include:",
        {
          list: {
            items: [
              "The Hydrogen sales channel isn't installed on the store.",
              "You don't have the required account permission to manage apps or channels.",
              "You're trying to connect to an ineligible store type (Trial, Development store)"
            ]
          }
        }
      ]);
    }
    throw error;
  }
}

export { adminRequest };
