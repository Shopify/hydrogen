import {
  defer,
  type LinksFunction,
  type MetaFunction,
  type LoaderArgs,
  type AppLoadContext,
} from '@shopify/remix-oxygen';
import {
  type FetcherWithComponents,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
  useLocation,
  useMatches,
  useFetchers,
} from '@remix-run/react';
import {Layout} from '~/components';
import {getLayoutData, type LayoutData} from '~/data';
import {GenericError} from './components/GenericError';
import {NotFound} from './components/NotFound';
import {Seo, Debugger} from './lib/seo';

import styles from './styles/app.css';
import favicon from '../public/favicon.svg';
import {DEFAULT_LOCALE} from './lib/utils';
import invariant from 'tiny-invariant';
import {Cart} from '@shopify/storefront-kit-react/storefront-api-types';
import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  ShopifyAppSource,
  ShopifyPageViewPayload,
  useShopifyCookies,
} from '@shopify/storefront-kit-react';
import {useEffect, useMemo} from 'react';
import {CartAction} from './lib/type';

export const handle = {
  // @todo - remove any and type the seo callback
  seo: (data: any) => ({
    title: data?.layout?.shop?.name,
    bypassTitleTemplate: true,
    titleTemplate: `%s | ${data?.layout?.shop?.name}`,
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

export async function loader({context}: LoaderArgs) {
  const [cartId, layout] = await Promise.all([
    context.session.get('cartId'),
    getLayoutData(context),
  ]);

  return defer({
    layout,
    selectedLocale: context.storefront.i18n,
    cart: cartId ? getCart(context, cartId) : undefined,
    analytics: {
      shopifyAppSource: ShopifyAppSource.hydrogen,
      shopId: 'gid://shopify/Shop/55145660472',
    },
  });
}

// To-do: move this to H2 package
function useExtractAnalyticsFromMatches(): Record<string, unknown> {
  const matches = useMatches();
  const analytics: Record<string, unknown> = {};

  matches.forEach((event) => {
    if (event?.data?.analytics) {
      Object.assign(analytics, event.data.analytics);
    }
  });

  return analytics;
}

function useCartActionCompleteFetchers(actionName: string) {
  const fetchers = useFetchers();
  const cartFetchers = [];

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    if (fetcher.data && formData && formData.get('cartAction') === actionName) {
      cartFetchers.push(fetcher);
    }
  }
  return cartFetchers;
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const locale = data.selectedLocale ?? DEFAULT_LOCALE;

  useShopifyCookies();
  const location = useLocation();
  const pageAnalytics = useExtractAnalyticsFromMatches();
  const currency = useMemo(() => {
    return locale.label.replace(/.*\(/, '').replace(/ .*/, '');
  }, [locale.label]);

  // Page view analytics
  useEffect(() => {
    console.log('Page view');
    // Fix this type error and make sure ClientBrowserParameters does not return Record <string, never>
    // @ts-ignore
    const payload: ShopifyPageViewPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
      currency,
      acceptedLanguage: locale.language.toLowerCase(),
      hasUserConsent: false,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload,
    });
  }, [location]);

  // Add to cart analytics
  const cartFetchers = useCartActionCompleteFetchers(CartAction.ADD_TO_CART);
  if (cartFetchers.length) {
    console.log('cartFetchers', cartFetchers);
  }

  return (
    <html lang={locale.language}>
      <head>
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout
          layout={data.layout as LayoutData}
          key={`${locale.language}-${locale.country}`}
        >
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
  const locale = root.data?.selectedLocale ?? DEFAULT_LOCALE;

  return (
    <html lang={locale.language}>
      <head>
        <title>{isNotFound ? 'Not found' : 'Error'}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout
          layout={root?.data?.layout}
          key={`${locale.language}-${locale.country}`}
        >
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
  const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;

  return (
    <html lang={locale.language}>
      <head>
        <title>Error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout layout={root?.data?.layout}>
          <GenericError error={error} />
        </Layout>
        <Scripts />
        <Debugger />
      </body>
    </html>
  );
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
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

export async function getCart({storefront}: AppLoadContext, cartId: string) {
  invariant(storefront, 'missing storefront client in cart query');

  const {cart} = await storefront.query<{cart?: Cart}>(CART_QUERY, {
    variables: {
      cartId,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    cache: storefront.CacheNone(),
  });

  return cart;
}
