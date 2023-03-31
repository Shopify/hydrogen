// This file is the root of every virtual route tree.
// It does not affect the routes from the user app.

import type {LinksFunction, MetaFunction} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import styles from './assets/styles.css';
import favicon from './assets/favicon.svg';
import {Layout} from './components/Layout.jsx';

export const links: LinksFunction = () => {
  return [
    {rel: 'stylesheet', href: styles},
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Hydrogen</title>
        <meta
          name="description"
          content="A custom storefront powered by Hydrogen"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
