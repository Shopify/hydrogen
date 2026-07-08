import {
  analyticsConsent as analyticsConsentConfig,
  analyticsShop as analyticsShopConfig,
  shop,
  defaultI18n,
} from "@shared/config";
import { Cache, gql } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";

import "./app.css";

import { Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigate } from "react-router";

import { AnalyticsTracker } from "~/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "~/components/CartAnalyticsTracker";
import { CartDrawer } from "~/components/CartDrawer";
import { ConsentBanner } from "~/components/ConsentBanner";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { customerAccountContext } from "~/lib/customer-account";
import { routeTemplates } from "~/lib/route-templates";
import { storefrontClientContext } from "~/lib/storefront-context";
import { storefrontMiddleware } from "~/lib/storefront-middleware";

import type { Route } from "./+types/root";

// Root middleware — the single Hydrogen request lifecycle entry point.
export const middleware: Route.MiddlewareFunction[] = [storefrontMiddleware];

// Static head links — Hydrogen favicon (rendered by <Links /> in the Layout).
export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

const SHOP_ANALYTICS_QUERY = gql(`
  query RootShopAnalytics {
    shop {
      id
      name
      description
    }
  }
`);

/**
 * Root loader — server-seeds the cart provider and resolves analytics shop
 * metadata. Per engineering.md F1, the cart is seeded here (the root route, not
 * a parent layout that blocks the shared shell) and the full `{cart, errors?}`
 * envelope is passed to `CartProvider` so `{cart: null}` tells the client the
 * server already checked (`hydrogen-cart-ui`).
 *
 * The analytics shop GID is fetched from the Storefront API and merged with the
 * client-safe `@shared/config` analytics metadata (`hydrogen-analytics`).
 */
export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const customerAccount = context.get(customerAccountContext);

  const cartPromise = cartHandlers
    .get({ storefrontClient })
    .then((result) => ({ cart: result.data.cart ?? null, errors: result.data.errors }))
    .catch((error) => {
      console.error("[hydrogen] Cart seed failed", error);
      return { cart: null };
    });

  // Resolve the analytics shop GID. Best-effort and NON-BLOCKING (F1): race
  // the query against a short timeout so a slow/cold Storefront API read never
  // blocks the shared shell — fall back to the config-derived shop GID/name.
  // The query is `Cache.long()`-cached, so warm requests resolve instantly.
  const shopFallback = {
    shopId: `gid://shopify/Shop/${shop.shopId}`,
    shopName: "CORE",
    shopDescription: null,
  };
  let shopId: string = shopFallback.shopId;
  let shopName: string = shopFallback.shopName;
  let shopDescription: string | null = shopFallback.shopDescription;
  try {
    const { data, errors } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY, {
      cache: Cache.long(),
      signal: AbortSignal.timeout(2000),
    });
    if (errors) {
      console.error("[hydrogen] Root shop query failed", errors);
    }
    shopId = data?.shop?.id ?? shopId;
    shopName = data?.shop?.name ?? shopName;
    shopDescription = data?.shop?.description ?? null;
  } catch (error) {
    console.error("[hydrogen] Root shop query failed or timed out", error);
  }

  const analyticsShop = {
    shopId,
    acceptedLanguage: analyticsShopConfig.acceptedLanguage,
    currency: analyticsShopConfig.currency,
    hydrogenSubchannelId: analyticsShopConfig.hydrogenSubchannelId,
  };

  // Customer Accounts: `accountEnabled` is false on mock.shop (handlers not
  // registered, no Customer Account API). `isLoggedIn` is only meaningful when
  // enabled; awaited alongside `cartPromise` so the header receives resolved
  // booleans (the root loader always resolves before SSR renders).
  const accountEnabled = customerAccount?.available ?? false;
  const isLoggedIn = accountEnabled
    ? await customerAccount.session.isLoggedIn(
        customerAccount.sessionManager,
        customerAccount.requestContext,
      )
    : false;

  return {
    cartData: await cartPromise,
    analyticsShop,
    analyticsConsent: analyticsConsentConfig,
    shopName,
    shopDescription,
    accountEnabled,
    isLoggedIn,
  };
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export default function App({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();

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
        aria-label="Announcement"
        className="bg-on-surface px-margin py-2.5 text-center"
      >
        <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
      </div>

      <Header accountEnabled={loaderData.accountEnabled} isLoggedIn={loaderData.isLoggedIn} />

      <main className="flex-1" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />

      <CartDrawer />
      <ConsentBanner />
      <AnalyticsTracker shop={loaderData.analyticsShop} consent={loaderData.analyticsConsent} />
      <CartAnalyticsTracker />

      <ShopifyScripts i18n={defaultI18n} shop={shop} navigate={navigate} routes={routeTemplates} />
    </CartProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="max-w-page px-margin mx-auto py-16">
      <h1 className="type-heading-xl mb-4">Something went wrong</h1>
      <p className="type-body text-on-surface-secondary">{message}</p>
    </div>
  );
}
