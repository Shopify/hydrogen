import type {Storefront, StorefrontApiErrors} from '@shopify/hydrogen';

import type {CustomerUserError} from '@shopify/hydrogen-react/unstable-storefront-api-types';

export interface NewsletterSubscribeHandlerResponse {
  isSuccessful: boolean;
  simplifyError?: string;
  userErrors?: CustomerUserError[];
  apiErrors?: StorefrontApiErrors;
}

export async function newsletterSubscribeHandler(
  storefront: Storefront,
  email: string | null,
): Promise<NewsletterSubscribeHandlerResponse> {
  if (!email) {
    return {
      isSuccessful: false,
      simplifyError: 'email is required.',
    };
  }

  const {errors, customerEmailMarketingSubscribe} = await storefront.mutate(
    NEWSLETTER_MUTATION,
    {
      variables: {email},
      storefrontApiVersion: 'unstable',
    },
  );

  if (!customerEmailMarketingSubscribe || errors?.length) {
    return {
      isSuccessful: false,
      simplifyError: 'The subscription failed.',
      apiErrors: errors,
    };
  }

  const {customer, customerUserErrors} = customerEmailMarketingSubscribe;

  return {
    isSuccessful: Boolean(customer),
    simplifyError: customerUserErrors?.length
      ? customerUserErrors[0].message
      : undefined,
    userErrors: customerUserErrors,
    apiErrors: errors,
  };
}

const NEWSLETTER_MUTATION = `#graphql
mutation CustomerEmailMarketingSubscribe(
  $email: String!
) {
  customerEmailMarketingSubscribe(email: $email) {
    customer { id }
    customerUserErrors {
      code
      field
      message
    }
  }
}
`;
