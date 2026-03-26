import { AnalyticsProvider } from "components/analytics/analytics-provider";
import { CartAnalyticsTracker } from "components/analytics/cart-analytics-tracker";
import { CartProvider } from "components/cart/cart-context";
import { Navbar } from "components/layout/navbar";
import { WelcomeToast } from "components/welcome-toast";
import { GeistSans } from "geist/font/sans";
import { getCart, getShopAnalyticsData } from "lib/shopify";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { baseUrl } from "lib/utils";

const { SITE_NAME } = process.env;

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: SITE_NAME!,
    template: `%s | ${SITE_NAME}`,
  },
  robots: {
    follow: true,
    index: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Don't await the fetch, pass the Promise to the context provider
  const cart = getCart();
  const shop = getShopAnalyticsData();

  const consent = {
    checkoutDomain: process.env.PUBLIC_CHECKOUT_DOMAIN || '',
    storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '',
    withPrivacyBanner: false,
    country: 'US',
    language: 'EN',
  };

  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="bg-neutral-50 text-black selection:bg-teal-300 dark:bg-neutral-900 dark:text-white dark:selection:bg-pink-500 dark:selection:text-white">
        <AnalyticsProvider shop={shop} consent={consent}>
          <CartProvider cartPromise={cart}>
            <CartAnalyticsTracker />
            <Navbar />
            <main>
              {children}
              <Toaster closeButton />
              <WelcomeToast />
            </main>
          </CartProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
