import {
  json,
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
import favicon from '../public/favicon.svg';
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

export async function loader({context}: LoaderFunctionArgs) {
  const layout = await context.storefront.query<{shop: Shop}>(LAYOUT_QUERY);
  return json(
    {
      layout,
      gtmContainerId: context.env.GTM_CONTAINER_ID,
    },
    {
      headers: partytownAtomicHeaders(),
    },
  );
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
