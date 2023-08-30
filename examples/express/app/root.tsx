import {defer, type LinksFunction, type LoaderArgs} from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  LiveReload,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import type {Cart, Shop} from '@shopify/hydrogen/storefront-api-types';
import {Layout} from '~/components/Layout';
import styles from './styles/app.css';
import favicon from '../public/favicon.svg';
import {useNonce} from '@shopify/hydrogen';

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

export async function loader({context}: LoaderArgs) {
  const [customerAccessToken, cartId] = await Promise.all([
    context.session.get('customerAccessToken'),
    context.session.get('cartId'),
  ]);

  const [cart, layout] = await Promise.all([
    cartId
      ? (
          await context.storefront.query<{cart: Cart}>(CART_QUERY, {
            variables: {
              cartId,
              /**
              Country and language properties are automatically injected
              into all queries. Passing them is unnecessary unless you
              want to override them from the following default:
              */
              country: context.storefront.i18n?.country,
              language: context.storefront.i18n?.language,
            },
            cache: context.storefront.CacheNone(),
          })
        ).cart
      : null,
    await context.storefront.query<{shop: Shop}>(LAYOUT_QUERY),
  ]);

  return defer({
    isLoggedIn: Boolean(customerAccessToken),
    cart,
    layout,
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const nonce = useNonce();

  const {name, description} = data.layout.shop;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout description={description} title={name}>
          <Outlet />
        </Layout>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <LiveReload nonce={nonce} />
      </body>
    </html>
  );
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  fragment CartFragment on Cart {
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
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...MoneyFragment
              }
              price {
                ...MoneyFragment
              }
              requiresShipping
              title
              image {
                ...ImageFragment
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
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalDutyAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
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

  fragment MoneyFragment on MoneyV2 {
    currencyCode
    amount
  }

  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;
