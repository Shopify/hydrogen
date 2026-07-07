import { initializeShopifyScripts } from "@shopify/hydrogen";
import { MetaProvider, Title } from "@solidjs/meta";
import { Router, useLocation, useNavigate } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, on, onMount, Suspense } from "solid-js";

import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AnalyticsEvent, getAnalytics } from "./lib/analytics";
import { CartProvider } from "./lib/cart";
import { routeTemplates } from "./lib/route-templates";

import "./app.css";

function AnalyticsTracker() {
  const location = useLocation();

  createEffect(() => {
    // oxlint-disable-next-line no-unused-expressions -- SolidJS reactivity: reading location fields subscribes this effect to navigation changes
    location.pathname;
    // oxlint-disable-next-line no-unused-expressions
    location.search;
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  });

  return null;
}

function ShopifyRoutes() {
  const navigate = useNavigate();

  onMount(() => {
    void initializeShopifyScripts({ navigate, routes: routeTemplates });
  });

  return null;
}

function RouteFocusManager() {
  const location = useLocation();

  createEffect(
    on(
      () => `${location.pathname}${location.search}`,
      () =>
        queueMicrotask(() =>
          document.getElementById("main-content")?.focus({ preventScroll: true }),
        ),
      { defer: true },
    ),
  );

  return null;
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Mock.shop — Hydrogen</Title>
          <ShopifyRoutes />
          <AnalyticsTracker />
          <RouteFocusManager />
          <CartProvider>
            <a
              href="#main-content"
              class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
            >
              Skip to main content
            </a>
            <Suspense>
              <Header />
            </Suspense>
            <Suspense>{props.children}</Suspense>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
