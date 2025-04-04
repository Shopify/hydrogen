import {
  createCustomerAccountClient,
  type HydrogenSession,
} from '@shopify/hydrogen';
import * as remixBuild from '@react-router/dev/server-build';
import {
  createRequestHandler,
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from '@shopify/remix-oxygen';

// In server.ts
export default {
  async fetch(
    request: Request,
    env: Record<string, string>,
    executionContext: ExecutionContext,
  ) {
    const session = await AppSession.init(request, [env.SESSION_SECRET]);

    function customAuthStatusHandler() {
      return new Response('Customer is not login', {
        status: 401,
      });
    }

    /* Create a Customer API client with your credentials and options */
    const customerAccount = createCustomerAccountClient({
      /* Runtime utility in serverless environments */
      waitUntil: (p) => executionContext.waitUntil(p),
      /* Public Customer Account API client ID for your store */
      customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_ID,
      /* Shop Id */
      shopId: env.SHOP_ID,
      request,
      session,
      customAuthStatusHandler,
    });

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      /* Inject the customer account client in the Remix context */
      getLoadContext: () => ({customerAccount}),
    });

    const response = await handleRequest(request);

    if (session.isPending) {
      response.headers.set('Set-Cookie', await session.commit());
    }

    return response;
  },
};

class AppSession implements HydrogenSession {
  public isPending = false;

  constructor(
    private sessionStorage: SessionStorage,
    private session: Session,
  ) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));

    return new this(storage, session);
  }

  get(key: string) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key: string, value: any) {
    this.session.flash(key, value);
  }

  unset(key: string) {
    this.isPending = true;
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.isPending = true;
    this.session.set(key, value);
  }

  commit() {
    this.isPending = false;
    return this.sessionStorage.commitSession(this.session);
  }
}

/////////////////////////////////
// In a route
import { useLoaderData, useRouteError, isRouteErrorResponse, useLocation } from 'react-router';
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context}: LoaderFunctionArgs) {
  if (!(await context.customerAccount.isLoggedIn())) {
    throw new Response('Customer is not login', {
      status: 401,
    });
  }

  const {data} = await context.customerAccount.query(
    `#graphql
    query getCustomer {
      customer {
        firstName
        lastName
      }
    }
    `,
  );

  return {customer: data.customer};
}

export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  if (isRouteErrorResponse(error)) {
    if (error.status == 401) {
      return (
        <a
          href={`/account/login?${new URLSearchParams({
            return_to: location.pathname,
          }).toString()}`}
        >
          Login
        </a>
      );
    }
  }
}

// this should be an default export
export function Route() {
  const {customer} = useLoaderData<typeof loader>();

  return (
    <div style={{marginTop: 24}}>
      {customer ? (
        <>
          <div style={{marginBottom: 24}}>
            <b>
              Welcome {customer.firstName} {customer.lastName}
            </b>
          </div>
        </>
      ) : null}
    </div>
  );
}
