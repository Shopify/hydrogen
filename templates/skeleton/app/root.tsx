import {useRouteError, isRouteErrorResponse} from '@remix-run/react';
import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import {Layout} from '~/components/Layout';
import styles from './styles/app.css';
import favicon from '../public/favicon.svg';

export function links() {
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
}

export async function loader({context}: LoaderArgs) {
  const {storefront, session} = context;

  // TODO: implement new cart
  const [customerAccessToken, cartId] = await Promise.all([
    session.get('customerAccessToken'),
    session.get('cartId'),
  ]);

  const [cart, layout] = await Promise.all([
    cartId
      ? await storefront.query(CART_QUERY, {
          variables: {cartId},
          cache: storefront.CacheNone(),
        })
      : null,
    await storefront.query(LAYOUT_QUERY, {
      cache: storefront.CacheLong(),
    }),
  ]);

  return defer({
    isLoggedIn: Boolean(customerAccessToken),
    cart,
    layout,
  });
}

export default function App() {
  const {layout} = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout shop={layout.shop}>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>Oops</h1>
        <p>Status: {error.status}</p>
        <p>{error.data.message}</p>
      </div>
    );
  }

  let errorMessage = 'Unknown error';
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div>
      <h1>Uh oh ...</h1>
      <p>Something went wrong.</p>
      <pre>{errorMessage}</pre>
    </div>
  );
}

// TODO: decide prefixing for queries Storefront vs Store vs _ ...
const CART_QUERY = `#graphql
  query StoreCart($cartId: ID!) {
    cart(id: $cartId) {
      ...Cart
    }
  }
  fragment Cart on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              ...Money
            }
            amountPerQuantity {
              ...Money
            }
            compareAtAmountPerQuantity {
              ...Money
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...Money
              }
              price {
                ...Money
              }
              requiresShipping
              title
              image {
                ...Image
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalDutyAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

  fragment Money on MoneyV2 {
    currencyCode
    amount
  }

  fragment Image on Image {
    id
    url
    altText
    width
    height
  }
` as const;

const LAYOUT_QUERY = `#graphql
  query StoreLayout {
    shop {
      name
    }
  }
` as const;
