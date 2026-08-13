import { Cache, gql } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigate,
  useRouteLoaderData,
  useRouteError,
} from "react-router";

import { AnalyticsTracker } from "~/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "~/components/CartAnalyticsTracker";
import { CartDrawer } from "~/components/CartDrawer";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { NotFound } from "~/components/NotFound";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { analyticsConsent, defaultI18n, defaultShop, getShop, getSiteOrigin } from "~/lib/config";
import { content } from "~/lib/content";
import { customerAccountContext } from "~/lib/customer-account";
import { envContext } from "~/lib/platform";
import { routeTemplates } from "~/lib/route-templates";
import { storefrontClientContext } from "~/lib/storefront-context";
import { storefrontMiddleware } from "~/lib/storefront-middleware";

import type { Route } from "./+types/root";

import appStyles from "./app.css?url";

// Root middleware — the single Hydrogen request lifecycle entry point.
export const middleware: Route.MiddlewareFunction[] = [storefrontMiddleware];

const LAYOUT_QUERY = gql(`
  query Layout {
    shop {
      name
    }
    collections(first: 3) {
      nodes {
        handle
        title
      }
    }
  }
`);

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: appStyles },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.get(envContext);
  const storefrontClient = context.get(storefrontClientContext);
  const customerAccount = context.get(customerAccountContext);

  const cartPromise = cartHandlers
    .get({ storefrontClient })
    .then((result) => ({ cart: result.data.cart ?? null, errors: result.data.errors }))
    .catch((error) => {
      console.error("[hydrogen] Cart seed failed", error);
      return { cart: null };
    });

  const layoutPromise = storefrontClient.graphql(LAYOUT_QUERY, { cache: Cache.long() });

  const accountEnabled = customerAccount?.available ?? false;
  const isLoggedIn = customerAccount?.available
    ? await customerAccount.session.isLoggedIn(
        customerAccount.sessionManager,
        customerAccount.requestContext,
      )
    : false;

  const layoutResult = await layoutPromise;
  if (layoutResult.errors || !layoutResult.data?.shop) {
    throw new Response("Shop query failed", { status: 500 });
  }

  return {
    cartData: await cartPromise,
    accountEnabled,
    isLoggedIn,
    shopName: layoutResult.data.shop.name,
    navCollections: layoutResult.data.collections.nodes,
    shop: getShop(env),
    siteOrigin: getSiteOrigin(env),
  };
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<typeof loader>("root");

  const htmlLang = defaultI18n.language.toLowerCase();
  return (
    <html lang={htmlLang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ShopifyScripts
          i18n={defaultI18n}
          shop={rootData?.shop ?? defaultShop}
          consent={analyticsConsent}
          navigate={navigate}
          routes={routeTemplates}
          inbox
        />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        {children}
        <shopify-chat />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <CartProvider initialData={loaderData.cartData}>
      <a
        href="#main-content"
        className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
      >
        Skip to content
      </a>

      <div
        role="region"
        aria-label={content.announcement.label}
        className="bg-on-surface px-margin py-2.5 text-center"
      >
        <p className="type-body-sm text-surface">{content.announcement.text}</p>
      </div>

      <Header
        accountEnabled={loaderData.accountEnabled}
        isLoggedIn={loaderData.isLoggedIn}
        shopName={loaderData.shopName}
      />

      <main className="flex-1" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer shopName={loaderData.shopName} collections={loaderData.navCollections} />

      <CartDrawer />
      <AnalyticsTracker />
      <CartAnalyticsTracker />
    </CartProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFound />;
    return (
      <div className="max-w-page px-margin mx-auto py-16">
        <h1 className="type-heading-xl mb-4">{error.status} — Something went wrong</h1>
        <p className="type-body text-on-surface-secondary">
          {typeof error.data === "string" && error.data
            ? error.data
            : "Something went wrong. Please try again."}
        </p>
      </div>
    );
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong. Please try again.";
  return (
    <div className="max-w-page px-margin mx-auto py-16">
      <h1 className="type-heading-xl mb-4">Something went wrong</h1>
      <p className="type-body text-on-surface-secondary">{message}</p>
    </div>
  );
}
