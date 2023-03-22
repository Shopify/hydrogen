import {
  json,
  type LinksFunction,
  type MetaFunction,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import {
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import type {
  Shop,
  Cart,
  CartLine,
} from '@shopify/hydrogen/storefront-api-types';
import styles from './styles/app.css';
import favicon from '../public/favicon.svg';
import {flattenConnection} from '@shopify/hydrogen';

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

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  viewport: 'width=device-width,initial-scale=1',
});

export async function loader({context}: LoaderArgs) {
  const cartId = await context.session.get('cartId');

  const [layout, cart] = await Promise.all([
    context.storefront.query<{shop: Shop}>(LAYOUT_QUERY),
    context.cart.get({cartId}),
  ]);

  const cartLines = cart
    ? flattenConnection(cart.lines).reduce(
        (previousValue: object, currentValue: unknown) => {
          const line = currentValue as CartLine;
          return {
            ...previousValue,
            [line.merchandise.id]: {
              id: line.id,
              merchandiseId: line.merchandise.id,
              quantity: line.quantity,
            },
          };
        },
        {},
      )
    : {};

  return json({layout, cart, cartLines});
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
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
