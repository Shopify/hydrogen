import type {RemixConfig} from '@remix-run/dev/dist/config.js';
import {renderSuccess, renderWarning} from '@shopify/cli-kit/node/ui';

// Sorted by importance for better warnings.
const REQUIRED_ROUTES = [
  '',
  'cart',
  'products',
  'products/:productHandle',

  'collections',
  //   'collections/all',
  //   'collections/:collectionHandle/:constraint',
  //   'collections/:collectionHandle/products/:productHandle',

  'sitemap.xml',
  'robots.xml',

  //   'pages/:pageHandle',
  //   'blogs/:blogHandle/tagged/:tagHandle',
  //   'blogs/:blogHandle/:articleHandle',
  //   'blogs/:blogHandle/:articleHandle/comments',

  //   'policies/:policyHandle',
  //   'variants/:variantId',
  //   'search',
  //   'gift_cards/:storeId/:cardId',
  //   'discounts/:discountCode',

  //   'account',
  //   'account/login',
  //   'account/register',
  //   'account/addresses',
  //   'account/orders',
  //   'account/orders/:orderId',
  //   'account/reset/:token',
  //   'account/activate/:token',

  //   'password',
  //   'opening_soon',
];

export function findMissingRoutes(config: RemixConfig) {
  const userRoutes = Object.values(config.routes);
  const requiredRoutes = new Set(REQUIRED_ROUTES);

  for (const requiredRoute of requiredRoutes) {
    for (const {path: userRoute} of userRoutes) {
      if (!requiredRoute && !userRoute) {
        requiredRoutes.delete(requiredRoute);
      } else if (requiredRoute && userRoute) {
        const reString =
          // Starts with optional params
          '^(:[^\\/\\?]+\\?\\/)?' +
          // Escape dots and replace params with regex
          requiredRoute.replaceAll('.', '\\.').replace(/:[^/]+/g, ':[^\\/]+') +
          '$';

        if (new RegExp(reString).test(userRoute)) {
          requiredRoutes.delete(requiredRoute);
        }
      }
    }
  }

  return [...requiredRoutes];
}

const LINE_LIMIT = 10;
export function logMissingRoutes(routes: string[]) {
  if (routes.length) {
    renderWarning({
      headline: 'Standard Shopify routes missing',
      body:
        'Your Hydrogen project is missing some standard Shopify routes. ' +
        'Including these routes improves compatibility with Shopify’s platform:\n\n' +
        routes
          .slice(0, LINE_LIMIT - (routes.length <= LINE_LIMIT ? 0 : 1))
          .map((route) => `• /${route}`)
          .join('\n') +
        (routes.length > LINE_LIMIT
          ? `\n• ...and ${routes.length - LINE_LIMIT + 1} more`
          : ''),
    });
  } else {
    renderSuccess({
      headline: 'All standard Shopify routes present',
    });
  }
}
