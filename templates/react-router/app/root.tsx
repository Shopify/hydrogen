import { handleShopifyRedirects, handleShopifyRoutes, gql } from "@shopify/hydrogen";
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
} from "react-router";

import { AnalyticsTracker, CartAnalyticsTracker } from "~/components/AnalyticsTrackers";
import { AnnouncementBar } from "~/components/AnnouncementBar";
import { CartDrawer } from "~/components/CartDrawer";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { loadAnnouncement } from "~/lib/announcement";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { envContext } from "~/lib/env";
import { routeTemplates } from "~/lib/route-templates";
import { createRequestSessionManager } from "~/lib/session";
import { analyticsConsent, analyticsShop, shop, storefrontConfig } from "~/lib/shop";
import {
  createRequestStorefrontClient,
  storefrontClientContext,
  storefrontRequestContext,
} from "~/lib/storefront";
import { normalizeStorefrontShop } from "~/lib/storefront-shop";

import type { Route } from "./+types/root";

import appStylesHref from "./app.css?url";

const ROOT_LAYOUT_QUERY = gql(`
  query RootLayout {
    shop {
      name
      brand {
        logo {
          alt
          image {
            url
            altText
            width
            height
          }
        }
      }
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
    collections(first: 5) {
      nodes {
        handle
        title
      }
    }
  }
`);

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, request }, next) => {
    const env = context.get(envContext);
    const storefrontClient = createRequestStorefrontClient(
      request,
      env,
      context.cache,
      context.waitUntil,
    );
    const requestContext = storefrontClient.requestContext;
    const sessionManager = createRequestSessionManager(request);

    const shopifyRoute = handleShopifyRoutes({
      request,
      requestContext,
      sessionManager,
      storefrontClient,
      routeTemplates,
      handlers: [cartHandlers],
    });

    if (shopifyRoute) return shopifyRoute;

    context.set(storefrontClientContext, storefrontClient);
    context.set(storefrontRequestContext, requestContext);

    const response = await next();
    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({
        request,
        storefrontClient,
        routeTemplates,
      });

      if (redirect) return redirect;
    }

    requestContext.applyResponseHeaders(response.headers);
    return response;
  },
];

export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.get(envContext);
  const storefrontClient = context.get(storefrontClientContext);
  const [cartResult, layoutResult, announcement] = await Promise.all([
    cartHandlers.get({ storefrontClient, request }),
    storefrontClient.graphql(ROOT_LAYOUT_QUERY),
    loadAnnouncement(storefrontClient),
  ]);

  if (layoutResult.errors) {
    console.error(
      `Root layout query failed: ${layoutResult.errors.map(({ message }) => message).join("\n")}`,
    );
  }

  return {
    cartData: cartResult.data,
    navCollections: layoutResult.data?.collections.nodes ?? [],
    shopInfo: normalizeStorefrontShop(layoutResult.data?.shop),
    announcement,
    analyticsShop,
    consent: analyticsConsent,
    enableAnalyticsTestTap: env.MOCK_SHOP === "1",
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ShopifyScripts
          i18n={storefrontConfig.i18n}
          shop={shop}
          consent={analyticsConsent}
          navigate={navigate}
          routes={routeTemplates}
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
    <CartProvider initialData={loaderData.cartData}>
      <AnalyticsTracker
        shop={loaderData.analyticsShop}
        consent={loaderData.consent}
        enableTestTap={loaderData.enableAnalyticsTestTap}
      />
      <CartAnalyticsTracker />
      <AnnouncementBar message={loaderData.announcement} />
      <Header navCollections={loaderData.navCollections} shopInfo={loaderData.shopInfo} />
      <Outlet />
      <Footer shopInfo={loaderData.shopInfo} />
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
