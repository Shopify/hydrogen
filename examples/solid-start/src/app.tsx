import { MetaProvider, Title } from "@solidjs/meta";
import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, Suspense } from "solid-js";

import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "./lib/analytics";
import { CartProvider } from "./lib/cart";

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
    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop: analyticsShop,
    });
  });

  return null;
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Mock.shop — Hydrogen</Title>
          <AnalyticsTracker />
          <CartProvider>
            <Header />
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
