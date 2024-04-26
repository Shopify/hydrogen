import { AbortError } from '@shopify/cli-kit/node/error';
import { adminRequest } from './client.js';

const CreateStorefrontMutation = `#graphql
  mutation CreateStorefront($title: String!) {
    hydrogenStorefrontCreate(title: $title) {
      hydrogenStorefront {
        id
        title
        productionUrl
      }
      userErrors {
        code
        field
        message
      }
      jobId
    }
  }
`;
async function createStorefront(adminSession, title) {
  const {
    hydrogenStorefrontCreate: { hydrogenStorefront, userErrors, jobId }
  } = await adminRequest(
    CreateStorefrontMutation,
    adminSession,
    { title }
  );
  if (!hydrogenStorefront || !jobId || userErrors.length > 0) {
    const errorMessages = userErrors.map(({ message }) => message).join(", ");
    throw new AbortError("Could not create storefront. " + errorMessages);
  }
  return { jobId, storefront: hydrogenStorefront };
}

export { createStorefront };
