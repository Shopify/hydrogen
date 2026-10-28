import {AbortError} from '@shopify/cli-kit/node/error';
import {adminRequest, type AdminSession} from './client.js';

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

interface HydrogenStorefront {
  id: string;
  title: string;
  productionUrl: string;
}

interface UserError {
  code: string | undefined;
  field: string[];
  message: string;
}

export interface CreateStorefrontSchema {
  hydrogenStorefrontCreate: {
    hydrogenStorefront: HydrogenStorefront | undefined;
    userErrors: UserError[];
    jobId: string | undefined;
  };
}

export async function createStorefront(
  adminSession: AdminSession,
  title: string,
) {
  const {
    hydrogenStorefrontCreate: {hydrogenStorefront, userErrors, jobId},
  } = await adminRequest<CreateStorefrontSchema>(
    CreateStorefrontMutation,
    adminSession,
    {title},
  );

  if (!hydrogenStorefront || !jobId || userErrors.length > 0) {
    const errorMessages = userErrors.map(({message}) => message).join(', ');
    throw new AbortError('Could not create storefront. ' + errorMessages);
  }

  return {jobId, storefront: hydrogenStorefront};
}
