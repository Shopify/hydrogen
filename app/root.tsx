import {
  AppLoadContext,
  CacheNone,
  defer,
  type LinksFunction,
  type LoaderFunction,
  type MetaFunction,
} from '@hydrogen/remix';
import {
  Links,
  Meta,
  Outlet,
  Params,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
  useMatches,
} from '@remix-run/react';
import {Layout} from '~/components';
import {getLayoutData, getCountries} from '~/data';
import {GenericError} from './components/GenericError';
import {NotFound} from './components/NotFound';
import {getSession} from './lib/session.server';
import {Seo, Debugger} from './lib/seo';

import styles from './styles/app.css';
import favicon from '../public/favicon.svg';
import {getLocalizationFromLang} from './lib/utils';
import invariant from 'tiny-invariant';
import {Cart} from '@shopify/hydrogen-react/storefront-api-types';

export const handle = {
  // @todo - remove any and type the seo callback
  seo: (data: any) => ({
    title: data.layout.shop.name,
    bypassTitleTemplate: true,
    titleTemplate: `%s | ${data.layout.shop.name}`,
  }),
};

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

export const loader: LoaderFunction = async function loader({
  request,
  context,
  params,
}) {
  const session = await getSession(request, context);
  const cartId = await session.get('cartId');

  return defer({
    layout: await getLayoutData(params),
    countries: getCountries(),
    cart: cartId ? getCart({cartId, params, context}) : undefined,
  });
};

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={data}>
          <Outlet />
        </Layout>
        <Debugger />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function CatchBoundary() {
  const [root] = useMatches();
  const caught = useCatch();
  const isNotFound = caught.status === 404;

  return (
    <html lang="en">
      <head>
        <title>{isNotFound ? 'Not found' : 'Error'}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={root.data as any}>
          {isNotFound ? (
            <NotFound type={caught.data?.pageType} />
          ) : (
            <GenericError
              error={{message: `${caught.status} ${caught.data}`}}
            />
          )}
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({error}: {error: Error}) {
  const [root] = useMatches();

  return (
    <html lang="en">
      <head>
        <title>Error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout data={root.data as any}>
          <GenericError error={error} />
        </Layout>
        <Scripts />
        <Debugger />
      </body>
    </html>
  );
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode = ZZ)
  @inContext(country: $country) {
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
    lines(first: 100, reverse: false) {
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

export async function getCart({
  cartId,
  params,
  context,
}: {
  cartId: string;
  params: Params;
  context: AppLoadContext;
}) {
  const {storefront} = context;
  invariant(storefront, 'missing storefront client in cart query');

  const {country} = getLocalizationFromLang(params.lang);

  const {cart} = await storefront.query<{cart: Cart}>({
    query: CART_QUERY,
    variables: {
      cartId,
      country,
    },
    cache: CacheNone(),
    headers: {
      'Cache-Control': 'no-store',
    },
  });

  invariant(cart, 'No data returned from Shopify API');

  return cart;
}
