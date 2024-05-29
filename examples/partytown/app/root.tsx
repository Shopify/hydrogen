import {
  defer,
  type LinksFunction,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import type {Shop} from '@shopify/hydrogen/storefront-api-types';
import styles from './styles/app.css';
import favicon from './assets/favicon.svg';
import {Script, useNonce} from '@shopify/hydrogen';

import {PartytownGoogleTagManager} from '~/components/PartytownGoogleTagManager';
import {Partytown} from '@builder.io/partytown/react';
import {maybeProxyRequest} from '~/utils/partytown/maybeProxyRequest';
import {partytownAtomicHeaders} from '~/utils/partytown/partytownAtomicHeaders';

export const links: LinksFunction = () => {
  return [
    {rel: 'stylesheet', href: styles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer(
    {...criticalData, ...deferredData},
    {
      headers: partytownAtomicHeaders(),
    },
  );
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: LoaderFunctionArgs) {
  const [layout] = await Promise.all([
    context.storefront.query<{shop: Shop}>(LAYOUT_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {
    layout,
    gtmContainerId: context.env.GTM_CONTAINER_ID,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  return {};
}

export default function App() {
  const {gtmContainerId} = useLoaderData<typeof loader>();
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>

      <body>
        {/* init GTM dataLayer container */}
        <Script
          type="text/partytown"
          dangerouslySetInnerHTML={{
            __html: `
              dataLayer = window.dataLayer || [];

              window.gtag = function () {
                dataLayer.push(arguments);
              };

              window.gtag('js', new Date());
              window.gtag('config', "${gtmContainerId}");
            `,
          }}
        />

        <PartytownGoogleTagManager gtmContainerId={gtmContainerId} />

        <Partytown
          nonce={nonce}
          forward={['dataLayer.push', 'gtag']}
          resolveUrl={maybeProxyRequest}
        />

        <Outlet />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;
