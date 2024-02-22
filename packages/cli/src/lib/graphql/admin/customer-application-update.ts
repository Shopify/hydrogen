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
  success: boolean;
  userErrors: {
    message: string;
    field: [string];
    code: string;
  }[];
}

export async function replaceCustomerApplicationUrls(
  adminSession: AdminSession,
  storefrontId: string,
  urlsReplaceInput: UrlsReplaceInput,
) {
  return {success: true};

  const response = await adminRequest<CustomerApplicationUrlsUpdateSchema>(
    CustomerApplicationUrlsReplace,
    {storefrontId, urlsReplaceInput},
  );
  return response;
}
