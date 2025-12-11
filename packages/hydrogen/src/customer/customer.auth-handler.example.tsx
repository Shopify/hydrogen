// Example: Custom session implementation in server.ts
// This shows how to use a custom session class with Hydrogen
import {
  createHydrogenContext,
  createRequestHandler,
  type HydrogenSession,
} from '@shopify/hydrogen';
import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from 'react-router';
import * as reactRouterBuild from 'virtual:react-router/server-build';

// In server.ts
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    // Example of using a custom session implementation
    const session = await AppSession.init(request, [env.SESSION_SECRET]);

    // Create the Hydrogen context with all the standard services
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache: {} as Cache, // Use your cache implementation
      waitUntil: (p) => executionContext.waitUntil(p),
      session, // Your custom session implementation must satisfy HydrogenSession interface
      // Add other options as needed
    });

    const handleRequest = createRequestHandler({
      build: reactRouterBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
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

// In env.d.ts
// Note: Hydrogen now provides default AppLoadContext augmentation
// If you need to extend it with additional properties, you can do:
// declare module 'react-router' {
//   interface AppLoadContext {
//     // Add your custom properties here
//   }
// }

/////////////////////////////////
// In a route (e.g., app/routes/account.tsx)
import {
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useLocation,
} from 'react-router';
// Import the Route namespace from the generated types
// Note: Replace 'account' with your actual route name
// import type {Route} from './+types/account';

// Using the Route.LoaderArgs type from generated types
// export async function loader({context}: Route.LoaderArgs) {
// For this example, we'll show the pattern with proper typing
import type {LoaderFunctionArgs} from 'react-router';
import type {CustomerAccount} from '@shopify/hydrogen';

export async function loader({context}: LoaderFunctionArgs) {
  const {data} = await context.customerAccount.query<{
    customer: {firstName: string; lastName: string};
  }>(`#graphql
    query getCustomer {
      customer {
        firstName
        lastName
      }
    }
    `);

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
