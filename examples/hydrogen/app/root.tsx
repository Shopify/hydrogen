import { Cache, type ConsentConfig, type ShopAnalytics } from "@shopify/hydrogen";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteLoaderData,
} from "react-router";

import favicon from "~/assets/favicon.svg";
import { CartAnalyticsSync, HydrogenAnalyticsProvider } from "~/lib/analytics";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { useNonce } from "~/lib/csp";
import { FOOTER_QUERY, HEADER_QUERY, type HeaderQuery } from "~/lib/fragments";
import { routeTemplates } from "~/lib/route-templates";

import type { Route } from "./+types/root";
import { PageLayout } from "./components/PageLayout";

import tailwindCss from "./styles/tailwind.css?url";
import appStyles from "~/styles/app.css?url";
import resetStyles from "~/styles/reset.css?url";

const FALLBACK_STOREFRONT_ID = "0";

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({ formMethod, currentUrl, nextUrl }) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== "GET") return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [{ rel: "icon", type: "image/svg+xml", href: favicon }];
}

export async function loader(args: Route.LoaderArgs) {
  const { storefront, env } = args.context;
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const analyticsShop = getAnalyticsShop({
    header: criticalData.header,
    publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
  });
  const shop = {
    shopId: env.SHOP_ID || criticalData.header.shop.id,
    storefrontId: env.PUBLIC_STOREFRONT_ID || FALLBACK_STOREFRONT_ID,
  };
  const i18n = {
    country: storefront.i18n.country,
    language: storefront.i18n.language,
    pathPrefix: storefront.i18n.pathPrefix,
  };

  return {
    ...deferredData,
    ...criticalData,
    i18n,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    analyticsShop,
    shop,
    consent: {
      mode: "no-banner",
      publicStorefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    } satisfies ConsentConfig,
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData(args: Route.LoaderArgs) {
  const { context } = args;
  const { storefront } = context;

  const [header, cartData] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: Cache.long(),
      variables: {
        headerMenuHandle: "main-menu", // Adjust to your header menu handle
      },
    }),
    cartHandlers.get({ storefrontClient: storefront }).then(({ data }) => data),
  ]);

  return { cartData, header };
}

function getAnalyticsShop({
  header,
  publicStorefrontId,
}: {
  header: HeaderQuery;
  publicStorefrontId: string;
}): ShopAnalytics | null {
  const currency = header.localization?.country?.currency?.isoCode;
  const language = header.localization?.language?.isoCode;

  if (!header.shop?.id || !currency || !language) return null;

  return {
    shopId: header.shop.id,
    acceptedLanguage: language,
    currency,
    hydrogenSubchannelId: publicStorefrontId || FALLBACK_STOREFRONT_ID,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  const { storefront, customerAccount } = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: Cache.long(),
      variables: {
        footerMenuHandle: "footer", // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    isLoggedIn: customerAccount.session.isLoggedIn(
      customerAccount.sessionManager,
      customerAccount.requestContext,
    ),
    footer,
  };
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>("root");
  const navigate = useNavigate();

  return (
    <html lang={toHtmlLang(data?.i18n)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
        <ShopifyScripts
          nonce={nonce}
          i18n={data?.i18n}
          routes={routeTemplates}
          shop={data?.shop}
          navigate={navigate}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function toHtmlLang(i18n: { country?: string; language?: string } | null | undefined) {
  if (!i18n?.language) return "en";
  const language = i18n.language.toLowerCase();
  const country = i18n.country ? `-${i18n.country.toUpperCase()}` : "";
  return `${language}${country}`;
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>("root");

  if (!data) {
    return <Outlet />;
  }

  return (
    <HydrogenAnalyticsProvider shop={data.analyticsShop} consent={data.consent}>
      <CartProvider initialData={data.cartData}>
        <CartAnalyticsSync />
        <PageLayout {...data}>
          <Outlet />
        </PageLayout>
      </CartProvider>
    </HydrogenAnalyticsProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = "Unknown error";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
