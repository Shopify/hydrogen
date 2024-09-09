import type {ActionFunctionArgs} from '@shopify/remix-oxygen';
import type {
  CustomerUserError,
  Customer,
  CustomerEmailMarketingSubscribePayload,
  CustomerSmsMarketingSubscribePayload,
} from '@shopify/hydrogen-react/unstable-storefront-api-types';

export type NewsletterSubscribeResponse = {
  customer: {id: string} | null;
  error: CustomerUserError['message'] | null;
};

export async function newsletterSubscribeHandler(
  args: ActionFunctionArgs,
): Promise<NewsletterSubscribeResponse> {
  try {
    const {context, request} = args;

    const formData = await request.formData();

    const phoneNumber = (
      formData.has('phoneNumber') ? formData.get('phoneNumber') : undefined
    ) as string | undefined;

    const email = (
      formData.has('email') ? formData.get('email') : undefined
    ) as string | undefined;

    if (!email && !phoneNumber) {
      throw new Error('An `email` or `phoneNumber` is required.');
    }

    let response:
      | {
          subscribe:
            | CustomerEmailMarketingSubscribePayload
            | CustomerSmsMarketingSubscribePayload;
        }
      | undefined = undefined;

    if (email) {
      response = await context.storefront.mutate(
        NEWSLETTER_EMAIL_SUBSCRIBE_MUTATION,
        {
          variables: {email},
          storefrontApiVersion: 'unstable',
        },
      );
    } else if (phoneNumber) {
      response = await context.storefront.mutate(
        NEWSLETTER_SMS_SUBSCRIBE_MUTATION,
        {
          variables: {phoneNumber},
          storefrontApiVersion: 'unstable',
        },
      );
    }

    if (!response?.subscribe) {
      throw new Error(
        'Missing or invalid response from newsletter subscribe mutation',
      );
    }

    const {customer, customerUserErrors} = response.subscribe;

    if (!customer || customerUserErrors?.length) {
      throw new Error(customerUserErrors?.[0].message ?? 'Unknown error');
    }

    return {customer, error: null};
  } catch (error) {
    let message =
      'An unexpected error occurred while subscribing to the newsletter.';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = JSON.stringify(error);
    }

    return {customer: null, error: message};
  }
}

// NOTE: https://shopify.dev/docs/api/storefront/unstable/mutations/customerEmailMarketingSubscribe
const NEWSLETTER_SMS_SUBSCRIBE_MUTATION = `#graphql
mutation CustomerSmsMarketingSubscribe($phoneNumber: String!) {
  subscribe: customerSmsMarketingSubscribe(phoneNumber: $phoneNumber) {
    customer { id }
    customerUserErrors {
      code
      field
      message
    }
  }
}
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/unstable/mutations/customerEmailMarketingSubscribe
const NEWSLETTER_EMAIL_SUBSCRIBE_MUTATION = `#graphql
mutation CustomerEmailMarketingSubscribe(
  $email: String!
) {
  subscribe: customerEmailMarketingSubscribe(email: $email) {
    customer { id  }
    customerUserErrors {
      code
      field
      message
    }
  }
}
` as const;
