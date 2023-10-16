import {
  json,
  redirect,
  type ActionArgs,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import jwtDecode from 'jwt-decode';
import {Multipassify} from '~/lib/multipass/multipassify.server';
import type {
  CustomerInfoType,
  GoogleJwtCredentialsType,
  MultipassRequestBody,
  NotLoggedInResponseType,
} from '~/lib/multipass/types';

/*
  Redirect document GET requests to the login page (housekeeping)
*/
export async function loader({params, context}: LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.lang ? `${params.lang}/account` : '/account');
  }
  return redirect(params.lang ? `${params.lang}/account` : '/account/login');
}

/*
  Generates a multipass token for a given customer and return_to url.
  Handles POST `/account/login/multipass` requests.
  expects body: { return_to?: string, customer }
*/
export async function action({request, context}: ActionArgs) {
  const {session, storefront, env} = context;
  const origin = request.headers.get('Origin') || '';
  const isOptionsReq = request.method === 'OPTIONS';
  const isPostReq = request.method === 'POST';
  let customerAccessToken;
  let customer: CustomerInfoType | undefined;

  try {
    // only POST and OPTIONS allowed
    if (!isOptionsReq && !isPostReq) {
      return handleMethodNotAllowed();
    }

    // handle OPTIONS preflight requests
    if (isOptionsReq) {
      return handleOptionsPreflight(origin);
    }

    // POST requests handler
    // Get the request body
    const body: MultipassRequestBody = await request.json();
    const token = body?.token;
    const provider = body?.provider;

    if (!session) {
      return NotLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_SESSION',
      });
    }

    // try to grab the customerAccessToken from the session if available
    customerAccessToken = await session.get('customerAccessToken');

    // attempmt to get the customer info from a thrid party token e.g google signin
    if (token) {
      if (provider === 'google') {
        const account: GoogleJwtCredentialsType = jwtDecode(token);

        // google derived jwt customer info
        customer = {
          first_name: account.given_name,
          last_name: account.family_name,
          email: account.email,
          multipass_identifier: account.sub,
          return_to: `/account`,
        };
      } else {
        // provider not supported
        return NotLoggedInResponse({
          url: body?.return_to ?? null,
          error: 'PROVIDER_NOT_SUPPORTED',
        });
      }
    } else if (customerAccessToken) {
      // Have a customerAccessToken, get the customer so we can find their email.
      const response: {customer: CustomerInfoType} = await storefront.query(
        CUSTOMER_INFO_QUERY,
        {
          variables: {
            customerAccessToken,
          },
        },
      );

      customer = response?.customer ?? null;
    } else {
      return handleLoggedOutResponse({
        return_to: body?.return_to ?? null,
        checkoutDomain: env.PRIVATE_SHOPIFY_CHECKOUT_DOMAIN,
      });
    }

    // Check if customer has the required fields to create a multipass token
    if (!customer?.email) {
      return NotLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_EMAIL',
      });
    }

    if (!customer?.return_to && !body?.return_to) {
      return NotLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_RETURN_TO_URL',
      });
    }

    try {
      // generate a multipass url and token
      const multipassify = new Multipassify(
        env.PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET,
      );

      const customerInfo: CustomerInfoType = {
        ...customer,
        created_at: new Date().toISOString(),
        return_to: customer?.return_to || body?.return_to || '',
      };

      // Generating a token for customer
      const data = multipassify.generate(
        customerInfo,
        env.PUBLIC_STORE_DOMAIN,
        request,
      );

      if (!data?.url) {
        return NotLoggedInResponse({
          url: body?.return_to ?? null,
          error: 'FAILED_GENERATING_MULTIPASS',
        });
      }

      // success, return token, url
      return json(
        {data: {...data, error: null}},
        {
          status: 200,
          headers: getCorsHeaders(origin),
        },
      );
    } catch (error) {
      let message = 'unknown error';
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = JSON.stringify(error);
      }

      return NotLoggedInResponse({
        url: body?.return_to ?? null,
        error: message,
      });
    }
  } catch (error) {
    let message = 'unknown error';
    if (error instanceof Error) {
      message = error.message;
      // eslint-disable-next-line no-console
      console.log('Multipass error:', error.message);
    } else {
      message = JSON.stringify(error);
    }

    return NotLoggedInResponse({
      url: null,
      error: message,
    });
  }
}

function handleMethodNotAllowed() {
  return json(
    {
      data: null,
      error: 'Method not allowed.',
    },
    {
      status: 405,
      headers: {Allow: 'POST, OPTIONS'},
    },
  );
}

function handleOptionsPreflight(origin: string) {
  return json(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Force log out a user in the checkout, if they logged out in the site.
// This fixes the edge-case where a user logs in (app),
// goes to checkout (logged in), then goes back to the app,
// logs out via the app and finally goes back to the checkout
// and the user is still logged in the checkout.
async function handleLoggedOutResponse(options: {
  return_to: string | null;
  checkoutDomain: string | undefined;
}) {
  const {return_to, checkoutDomain} = options;
  const isCheckoutReq = /\/[\w-]{32}$/g.test(return_to || '');

  if (!return_to || !isCheckoutReq) {
    return NotLoggedInResponse({
      url: null,
      error: 'NOT_AUTHORIZED',
    });
  }

  // Force logging off the user in the checkout
  const encodedCheckoutUrl = encodeURIComponent(return_to);

  // For example, checkoutDomain `checkout.hydrogen.shop` or `shop.example.com` or `{shop}.myshopify.com`.
  const logOutUrl = `https://${checkoutDomain}/account/logout?return_url=${encodedCheckoutUrl}&step=contact_information`;
  return json({data: {url: logOutUrl}, error: null});
}

/*
  Helper response when errors occur.
*/
function NotLoggedInResponse(options: NotLoggedInResponseType) {
  interface ErrorsType {
    [key: string]: string;
  }

  const ERRORS: ErrorsType = {
    MISSING_SESSION: 'No session found.',
    MISSING_EMAIL: 'Required customer `email` was not provided.',
    MISSING_RETURN_TO_URL:
      'Required customer `return_to` URL was not provided.',
    FAILED_GENERATING_MULTIPASS: 'Could not generate a multipass url.',
    'Invalid Secret': 'Invalid Secret',
    PROVIDER_NOT_SUPPORTED: 'Provider not supported.',
    NOT_AUTHORIZED: 'Not authorized.',
  };

  const {url, error: errorKey} = options;

  let error;
  if (!errorKey) {
    error = 'UNKNOWN_ERROR';
  } else {
    error = ERRORS[errorKey] ?? 'UNKNOWN_ERROR';
  }

  console.error('Multipass not logged in error:', error);

  // Always return the original URL.
  return json({data: {url}, error});
}

function getCorsHeaders(origin: string): {[key: string]: string} {
  // Only requests from these origins will pass pre-flight checks
  const allowedOrigin = [
    origin,
    // Add other domains that you'd like to allow to multipass from
    // 'https://example.com',
  ].find((allowedHost) => origin.includes(allowedHost));

  return {
    'Access-Control-Allow-Origin': `${allowedOrigin}`,
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept',
  };
}

const CUSTOMER_INFO_QUERY = `#graphql
  query CustomerInfo($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      phone
      email
      acceptsMarketing
    }
  }
`;
