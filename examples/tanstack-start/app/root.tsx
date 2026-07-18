import {
  analyticsConsent as analyticsConsentConfig,
  analyticsShop as analyticsShopConfig,
  defaultI18n,
  shop,
} from "@shared/config";
import { Cache, gql } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { HeadContent, Outlet, Scripts, createRootRoute, useNavigate } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { AnalyticsTracker } from "~/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "~/components/CartAnalyticsTracker";
import { CartDrawer } from "~/components/CartDrawer";
import { ConsentBanner } from "~/components/ConsentBanner";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { CartProvider } from "~/lib/cart";
import { routeTemplates } from "~/lib/route-templates";

import appCss from "./app.css?url";

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
 * Seed the cart and analytics metadata from the request-scoped Hydrogen
 * context. The same context is shared by Shopify standard routes, server
 * functions, and the SSR render for this request.
 */
// The cart query type intentionally carries open `unknown` index signatures so
// custom fragments can extend it. Its runtime value is JSON-safe, but that
// extensibility prevents TanStack's static serializer check from proving it.
const getRootData = createServerFn({ method: "GET", strict: { output: false } }).handler(
  async ({ context }) => {
    const { cartHandlers, customerAccount, storefrontClient } = context;
    const cartPromise = cartHandlers
      .get({ storefrontClient })
      .then((result) => ({ cart: result.data.cart ?? null, errors: result.data.errors }))
      .catch((error) => {
        console.error("[hydrogen] Cart seed failed", error);
        return { cart: null };
      });

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
      if (errors) console.error("[hydrogen] Root shop query failed", errors);
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

    const accountEnabled = customerAccount.available;
    const isLoggedIn = accountEnabled
      ? await customerAccount.session.isLoggedIn(
          customerAccount.sessionManager,
          customerAccount.requestContext,
        )
      : false;
    if (isLoggedIn) {
      customerAccount.requestContext.markResponseAsPersonalized("customer-account");
    }

    return {
      cartData: await cartPromise,
      analyticsShop,
      analyticsConsent: analyticsConsentConfig,
      shopName,
      shopDescription,
      accountEnabled,
      isLoggedIn,
    };
  },
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  loader: () => getRootData(),
  component: App,
  shellComponent: RootDocument,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <CartProvider initialData={loaderData.cartData}>
      <AnalyticsTracker shop={loaderData.analyticsShop} consent={loaderData.analyticsConsent} />

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
      <CartAnalyticsTracker />

      <ShopifyScripts
        i18n={defaultI18n}
        shop={shop}
        navigate={(url) => navigate({ href: url })}
        routes={routeTemplates}
      />
    </CartProvider>
  );
}

function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="max-w-page px-margin mx-auto py-16">
      <h1 className="type-heading-xl mb-4">Something went wrong</h1>
      <p className="type-body text-on-surface-secondary mb-6">{message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-button button-outline inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="max-w-page px-margin mx-auto py-16 text-center">
      <h1 className="type-display mb-4">Page not found</h1>
      <p className="type-body text-on-surface-secondary mb-6">
        The page you requested does not exist or is no longer available.
      </p>
      <a
        href="/"
        className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
      >
        Back to home
      </a>
    </div>
  );
}
