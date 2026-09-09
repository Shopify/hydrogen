import { analyticsConsent, defaultI18n, shop } from "@shared/config";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useNavigate,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  AnalyticsTracker,
  CartAnalyticsTracker,
  RouteFocusManager,
} from "~/components/AnalyticsTrackers";
import { CartDrawer } from "~/components/CartDrawer";
import { Footer } from "~/components/Footer";
import { Header } from "~/components/Header";
import { CartProvider } from "~/lib/cart";
import { routeTemplates } from "~/lib/route-templates";
import { getRootData } from "~/server/root";

import appStylesHref from "../app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CORE" },
    ],
    links: [
      { rel: "stylesheet", href: appStylesHref },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  // The cart is client-authoritative after hydration and the nav is static, so
  // never refetch the root data on navigation or preload.
  loader: () => getRootData(),
  staleTime: Infinity,
  shouldReload: false,
  shellComponent: RootShell,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <ShopifyScripts
          i18n={defaultI18n}
          shop={shop}
          consent={analyticsConsent}
          navigate={(href) => navigate({ href })}
          routes={routeTemplates}
        />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <a
          href="#main-content"
          className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { cartData, navCollections } = Route.useLoaderData();

  return (
    <CartProvider initialData={cartData}>
      <AnalyticsTracker />
      <CartAnalyticsTracker />
      <RouteFocusManager />
      <div
        role="region"
        aria-label="Announcement"
        className="bg-on-surface px-margin py-2.5 text-center"
      >
        <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
      </div>
      <Header navCollections={navCollections} />
      <Outlet />
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}

function NotFoundPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-12"
    >
      <h1 className="type-display text-on-surface">404</h1>
      <p className="text-on-surface-secondary mt-4">The requested page could not be found.</p>
      <Link
        to="/"
        className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Back to home
      </Link>
    </main>
  );
}

function ErrorPage({ error }: ErrorComponentProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-12"
    >
      <h1 className="type-display text-on-surface">Error</h1>
      <p className="text-on-surface-secondary mt-4">An unexpected error occurred.</p>
      {import.meta.env.DEV ? (
        <pre className="border-border mt-6 w-full overflow-x-auto rounded border p-4 text-sm">
          <code>{error.stack ?? error.message}</code>
        </pre>
      ) : null}
    </main>
  );
}
