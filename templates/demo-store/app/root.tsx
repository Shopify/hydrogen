import {
  defer,
  type LinksFunction,
  type LoaderArgs,
  type AppLoadContext,
} from '@shopify/remix-oxygen';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
  useRouteError,
} from '@remix-run/react';
import {ShopifySalesChannel, Seo} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {Layout} from '~/components';
import {seoPayload} from '~/lib/seo.server';

import favicon from '../public/favicon.svg';

import {GenericError} from './components/GenericError';
import {NotFound} from './components/NotFound';
import styles from './styles/app.css';
import {DEFAULT_LOCALE, parseMenu} from './lib/utils';
import {useAnalytics} from './hooks/useAnalytics';

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

export async function loader({request, context}: LoaderArgs) {
  const {session, storefront, cart} = context;
  const [customerAccessToken, layout] = await Promise.all([
    session.get('customerAccessToken'),
    getLayoutData(context),
  ]);

  const seo = seoPayload.root({shop: layout.shop, url: request.url});

  return defer({
    isLoggedIn: Boolean(customerAccessToken),
    layout,
    selectedLocale: storefront.i18n,
    cart: cart.get(),
    analytics: {
      shopifySalesChannel: ShopifySalesChannel.hydrogen,
      shopId: layout.shop.id,
    },
    seo,
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const locale = data.selectedLocale ?? DEFAULT_LOCALE;
  const hasUserConsent = true;

  useAnalytics(hasUserConsent);

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Seo />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout
          key={`${locale.language}-${locale.country}`}
          layout={data.layout}
        >
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({error}: {error: Error}) {
  const [root] = useMatches();
  const locale = root?.data?.selectedLocale ?? DEFAULT_LOCALE;
  const routeError = useRouteError();
  const isRouteError = isRouteErrorResponse(routeError);

  let title = 'Error';
  let pageType = 'page';

  if (isRouteError) {
    title = 'Not found';
    if (routeError.status === 404) pageType = routeError.data || pageType;
  }

  return (
    <html lang={locale.language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout
          layout={root?.data?.layout}
          key={`${locale.language}-${locale.country}`}
        >
          {isRouteError ? (
            <>
              {routeError.status === 404 ? (
                <NotFound type={pageType} />
              ) : (
                <GenericError
                  error={{message: `${routeError.status} ${routeError.data}`}}
                />
              )}
            </>
          ) : (
            <GenericError error={error instanceof Error ? error : undefined} />
          )}
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}

const LAYOUT_QUERY = `#graphql
  query layout(
    $language: LanguageCode
    $headerMenuHandle: String!
    $footerMenuHandle: String!
  ) @inContext(language: $language) {
    shop {
      ...Shop
    }
    headerMenu: menu(handle: $headerMenuHandle) {
      ...Menu
    }
    footerMenu: menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
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

async function getLayoutData({storefront, env}: AppLoadContext) {
  const data = await storefront.query(LAYOUT_QUERY, {
    variables: {
      headerMenuHandle: 'main-menu',
      footerMenuHandle: 'footer',
      language: storefront.i18n.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  /*
    Modify specific links/routes (optional)
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    e.g here we map:
      - /blogs/news -> /news
      - /blog/news/blog-post -> /news/blog-post
      - /collections/all -> /products
  */
  const customPrefixes = {BLOG: '', CATALOG: 'products'};

  const headerMenu = data?.headerMenu
    ? parseMenu(
        data.headerMenu,
        data.shop.primaryDomain.url,
        env,
        customPrefixes,
      )
    : undefined;

  const footerMenu = data?.footerMenu
    ? parseMenu(
        data.footerMenu,
        data.shop.primaryDomain.url,
        env,
        customPrefixes,
      )
    : undefined;

  return {shop: data.shop, headerMenu, footerMenu};
}
