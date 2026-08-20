import { Cache, gql } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteLoaderData,
} from "react-router";

import { AnalyticsTracker, CartAnalyticsTracker } from "~/components/AnalyticsTrackers";
import { CartDrawer } from "~/components/CartDrawer";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { customerAccountContext } from "~/lib/customer-account";
import { runtimeConfigContext } from "~/lib/env";
import { routeTemplates } from "~/lib/route-templates";
import {
  analyticsConsent,
  assertCustomerAccountShop,
  createShopIdentity,
  defaultI18n,
} from "~/lib/shop";
import { storefrontClientContext, storefrontMiddleware } from "~/lib/storefront";

import type { Route } from "./+types/root";

import appStylesHref from "./app.css?url";

const SHOP_QUERY = gql(`
  query ShopIdentity {
    shop {
      id
      name
    }
  }
`);

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const middleware: Route.MiddlewareFunction[] = [storefrontMiddleware];

export async function loader({ context, request }: Route.LoaderArgs) {
  const config = context.get(runtimeConfigContext);
  const storefrontClient = context.get(storefrontClientContext);
  const customerAccount = context.get(customerAccountContext);
  const [cartResult, shopResult, isLoggedIn] = await Promise.all([
    cartHandlers.get({ storefrontClient, request }),
    storefrontClient.graphql(SHOP_QUERY, { cache: Cache.long() }),
    customerAccount.available
      ? customerAccount.session.isLoggedIn(
          customerAccount.sessionManager,
          customerAccount.requestContext,
        )
      : false,
  ]);

  if (shopResult.errors || !shopResult.data?.shop) {
    throw new Response("Shop query failed", { status: 500 });
  }
  assertCustomerAccountShop(config, shopResult.data.shop.id);

  const shop = createShopIdentity(config, shopResult.data.shop);

  return {
    accountAvailable: customerAccount.available,
    analyticsShop: shop.analytics,
    cartData: cartResult.data,
    consent: analyticsConsent,
    enableAnalyticsTestTap: config.enableAnalyticsTestTap,
    isLoggedIn,
    shop: shop.scripts,
    shopName: shopResult.data.shop.name,
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<typeof loader>("root");

  return (
    <html lang={defaultI18n.language.toLowerCase()}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {rootData?.shop ? (
          <ShopifyScripts
            i18n={defaultI18n}
            shop={rootData.shop}
            consent={analyticsConsent}
            navigate={navigate}
            routes={routeTemplates}
          />
        ) : null}
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
    <CartProvider initialData={loaderData.cartData}>
      <AnalyticsTracker
        shop={loaderData.analyticsShop}
        consent={loaderData.consent}
        enableTestTap={loaderData.enableAnalyticsTestTap}
      />
      <CartAnalyticsTracker />
      <div
        role="region"
        aria-label="Announcement"
        className="bg-on-surface px-margin py-2.5 text-center"
      >
        <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
      </div>
      <Header
        accountAvailable={loaderData.accountAvailable}
        isLoggedIn={loaderData.isLoggedIn}
        shopName={loaderData.shopName}
      />
      <Outlet />
      <Footer shopName={loaderData.shopName} />
      <CartDrawer />
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
