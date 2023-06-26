import {adminRequest, type AdminSession} from './client.js';

export const CreateStorefrontMutation = `#graphql
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

interface CreateStorefrontSchema {
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
  const {hydrogenStorefrontCreate} = await adminRequest<CreateStorefrontSchema>(
    CreateStorefrontMutation,
    adminSession,
    {title: title},
  );

  return {
    adminSession,
    storefront: hydrogenStorefrontCreate.hydrogenStorefront,
    userErrors: hydrogenStorefrontCreate.userErrors,
    jobId: hydrogenStorefrontCreate.jobId,
  };
}
