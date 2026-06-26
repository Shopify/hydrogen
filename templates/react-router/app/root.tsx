import {
  handleShopifyRedirects,
  handleShopifyRoutes,
  gql,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { AnalyticsTracker, CartAnalyticsTracker } from "~/components/AnalyticsTrackers";
import { CartDrawer } from "~/components/CartDrawer";
import { ConsentBanner } from "~/components/ConsentBanner";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { envContext } from "~/lib/env";
import { analyticsConsent, analyticsShop } from "~/lib/shop";
import {
  createRequestStorefrontClient,
  storefrontClientContext,
  storefrontRequestContext,
} from "~/lib/storefront";

import type { Route } from "./+types/root";

import "./app.css";

const NAV_COLLECTIONS_QUERY = gql(`
  query NavCollections {
    collections(first: 5) {
      nodes {
        handle
        title
      }
    }
  }
`);

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

function withStorefrontHeaders(response: Response, requestContext: StorefrontRequestContext) {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutable = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutable.headers);
    return mutable;
  }
}

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const env = context.get(envContext);
    const storefrontClient = createRequestStorefrontClient(request, env);
    const requestContext = storefrontClient.requestContext;

    const shopifyRoute = await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [cartHandlers],
    });
    if (shopifyRoute) return withStorefrontHeaders(shopifyRoute, requestContext);

    context.set(storefrontClientContext, storefrontClient);
    context.set(storefrontRequestContext, requestContext);

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({ request, storefrontClient });
      if (redirect) return withStorefrontHeaders(redirect, requestContext);
    }

    return withStorefrontHeaders(response, requestContext);
  },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const [cartResult, navResult] = await Promise.all([
    cartHandlers.get({ storefrontClient, request }),
    storefrontClient.graphql(NAV_COLLECTIONS_QUERY),
  ]);

  return {
    cart: cartResult.data.cart,
    navCollections: navResult.data?.collections.nodes ?? [],
    analyticsShop,
    consent: analyticsConsent,
    forceConsentBanner: context.get(envContext).MOCK_SHOP === "1",
  };
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="module"
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          crossOrigin="anonymous"
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <a
          href="#main-content"
          className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
        >
          Skip to content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cart ?? undefined}>
      <AnalyticsTracker
        shop={loaderData.analyticsShop}
        consent={loaderData.consent}
        enableTestTap={loaderData.forceConsentBanner}
      />
      <CartAnalyticsTracker />
      <div
        role="region"
        aria-label="Announcement"
        className="bg-on-surface px-margin py-2.5 text-center"
      >
        <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
      </div>
      <Header navCollections={loaderData.navCollections} />
      <Outlet />
      <Footer />
      <CartDrawer />
      <ConsentBanner forceShow={loaderData.forceConsentBanner} />
    </CartProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-12"
    >
      <h1 className="type-display text-on-surface">{message}</h1>
      <p className="text-on-surface-secondary mt-4">{details}</p>
      {stack ? (
        <pre className="border-border mt-6 w-full overflow-x-auto rounded border p-4 text-sm">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
