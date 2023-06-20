import {adminRequest} from '../../graphql.js';
import {getAdminSession} from '../../admin-session.js';
import {type UserError} from '../../user-errors.js';

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

interface CreateStorefrontSchema {
  hydrogenStorefrontCreate: {
    hydrogenStorefront: HydrogenStorefront | undefined;
    userErrors: UserError[];
    jobId: string | undefined;
  };
}

export async function createStorefront(shop: string, title: string) {
  const adminSession = await getAdminSession(shop);

  const {hydrogenStorefrontCreate} = await adminRequest<CreateStorefrontSchema>(
    CreateStorefrontMutation,
    adminSession,
    {
      title: title,
    },
  );

  return {
    adminSession,
    storefront: hydrogenStorefrontCreate.hydrogenStorefront,
    userErrors: hydrogenStorefrontCreate.userErrors,
    jobId: hydrogenStorefrontCreate.jobId,
  };
}
