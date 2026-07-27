import { analyticsConsent, defaultI18n, shop } from "@shared/config";
import { ShopifyScripts } from "@shopify/hydrogen/react";

import "./app.css";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router";

import { AnalyticsTracker } from "~/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "~/components/CartAnalyticsTracker";
import { CartDrawer } from "~/components/CartDrawer";
import { ConsentBanner } from "~/components/ConsentBanner";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { NotFound } from "~/components/NotFound";
import { CartProvider } from "~/lib/cart";
import { cartHandlers } from "~/lib/cart-handlers";
import { content } from "~/lib/content";
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

/**
 * Root loader — server-seeds the cart provider. Per engineering.md F1, the cart
 * is seeded here (the root route, not a parent layout that blocks the shared
 * shell) and the full `{cart, errors?}` envelope is passed to `CartProvider` so
 * `{cart: null}` tells the client the server already checked (`hydrogen-cart-ui`).
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
    accountEnabled,
    isLoggedIn,
  };
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  // `<html lang>` is derived from the i18n config source of truth
  // (`@shared/config` `defaultI18n.language`) rather than a hardcoded literal
  // (R20), so a store language change flows here automatically.
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
          shop={shop}
          consent={analyticsConsent}
          navigate={navigate}
          routes={routeTemplates}
          inbox
        />
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

      <Header accountEnabled={loaderData.accountEnabled} isLoggedIn={loaderData.isLoggedIn} />

      <main className="flex-1" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />

      <CartDrawer />
      <ConsentBanner />
      <AnalyticsTracker />
      <CartAnalyticsTracker />
    </CartProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  // Route loaders throw `new Response("...", { status })` which React Router
  // wraps in an `ErrorResponse` (NOT an `Error`). Branch on
  // `isRouteErrorResponse` so a 404 renders the themed catch-all UI and other
  // statuses render their status + data, instead of `[object Object]` from
  // `String(error)` (R1 / known #4).
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
