import { adminRequest } from './client.js';

const CUSTOMER_APPLICATION_URLS_REPLACE = `#graphql
  mutation CustomerApplicationUrlsReplace($storefrontId: ID!, $urlsReplaceInput: HydrogenStorefrontCustomerApplicationUrlsReplaceInput!) {
    hydrogenStorefrontCustomerApplicationUrlsReplace(
      storefrontId: $storefrontId,
      urlsReplaceInput: $urlsReplaceInput,
    ) {
      success
      userErrors {
        code
        field
        message
      }
    }
  }
`;
async function replaceCustomerApplicationUrls(adminSession, storefrontId, urlsReplaceInput) {
  const {
    hydrogenStorefrontCustomerApplicationUrlsReplace: { success, userErrors }
  } = await adminRequest(
    CUSTOMER_APPLICATION_URLS_REPLACE,
    adminSession,
    { storefrontId, urlsReplaceInput }
  );
  return { success, userErrors };
}

export { CUSTOMER_APPLICATION_URLS_REPLACE, replaceCustomerApplicationUrls };
