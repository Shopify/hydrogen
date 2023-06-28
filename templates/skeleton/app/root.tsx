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
import resetStyles from './styles/reset.css';
import skeletonStyles from './styles/skeleton.css';
import favicon from '../public/favicon.svg';

export function links() {
  return [
    {rel: 'stylesheet', href: resetStyles},
    {rel: 'stylesheet', href: skeletonStyles},
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

  // validate the customer access token is valid
  let isLoggedIn = false;
  const headers = new Headers();
  if (customerAccessToken?.accessToken && customerAccessToken?.expiresAt) {
    const expiresAt = new Date(customerAccessToken.expiresAt);
    const dateNow = new Date();
    const customerAccessTokenExpired = expiresAt < dateNow;
    isLoggedIn =
      !customerAccessTokenExpired && Boolean(customerAccessToken.accessToken);
    if (customerAccessTokenExpired) {
      session.unset('customerAccessToken');
      headers.append('Set-Cookie', await session.commit());
    }
  }

  // await the header query
  const header = await storefront.query(HEADER_QUERY, {
    cache: storefront.CacheLong(),
    variables: {
      headerMenuHandle: 'main-menu',
    },
  });

  // defer the footer query
  const footer = storefront.query(FOOTER_QUERY, {
    cache: storefront.CacheLong(),
    variables: {
      footerMenuHandle: 'footer',
    },
  });

  // defer the cart query
  const cart = cartId
    ? storefront.query(CART_QUERY, {
        variables: {cartId},
        cache: storefront.CacheNone(),
      })
    : Promise.resolve({cart: null});

  return defer(
    {
      cart,
      footer,
      header,
      isLoggedIn,
    },
    {headers},
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout {...data}>
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
        <p>Message: {error.data.message}</p>
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

const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
` as const;

const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $language: LanguageCode
    $headerMenuHandle: String!
  ) @inContext(language: $language) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;

const FOOTER_QUERY = `#graphql
  query Footer(
    $language: LanguageCode
    $footerMenuHandle: String!
  ) @inContext(language: $language) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
` as const;

const CART_QUERY = `#graphql
  query Cart($cartId: ID!) {
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
