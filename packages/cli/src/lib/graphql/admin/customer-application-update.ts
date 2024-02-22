import {adminRequest, type AdminSession} from './client.js';

export const CustomerApplicationUrlsReplace = `#graphql
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

export interface UrlsReplaceInput {
  redirectUri?: {
    add?: [string];
    removeRegex?: string;
  };
  javascriptOrigin?: {
    add?: [string];
    removeRegex?: string;
  };
  logoutUris?: {
    add?: [string];
    removeRegex?: string;
  };
}

export interface CustomerApplicationUrlsUpdateSchema {
  hydrogenStorefrontCustomerApplicationUrlsReplace: {
    success: boolean;
    userErrors: {
      message: string;
      field: [string];
      code: string;
    }[];
  };
}

export async function replaceCustomerApplicationUrls(
  adminSession: AdminSession,
  storefrontId: string,
  urlsReplaceInput: UrlsReplaceInput,
) {
  const {
    hydrogenStorefrontCustomerApplicationUrlsReplace: {success, userErrors},
  } = await adminRequest<CustomerApplicationUrlsUpdateSchema>(
    CustomerApplicationUrlsReplace,
    adminSession,
    {storefrontId, urlsReplaceInput},
  );

  return {success, userErrors};
}
