import type {LoaderFunction} from '@remix-run/oxygen';

/**
Note that we're _not_ solving for Online Redirects here (but we could do some similar work as found here, if we wanted to solve Redirects in the Hydrogen layer)

The problem we’re trying to solve is that the Online Store has predefined URLs for products, collections, pages, etc.

For example, the URL for a collection will ALWAYS be something like "/collections/{id}".

However, with Hydrogen, devs can create any routing structure that they want.

This is a problem if we want the whole Shopify ecosystem, such as apps and channels (google, pinterest, etc.) to all work, as they assume that these predetermined URLs will always exist.

One potential solution is to use a special Remix splat at "/routes/$.tsx", which acts like a "catch-all" 404 handler.

https://remix.run/docs/en/v1/guides/routing#splats

If a route isn't found in Remix, (for example, the developer hasn't created a "/collections/{id}" route (or doesn't want to)

404s will hit this route, and we can check if the URL requested was one of those special, predefined ones that the Shopify ecosystem expects

If it is, then the dev can redirect them to their own special URL.

If it isn't a predefined URL, render the normal 404 page.

We can do they syncronously, as these predefined URLs are pretty static.

(This currently doesn't work, due to issues in how demo-store handles 'lang')
 */
export const loader: LoaderFunction = async ({params}) => {
  const isStandardUrl = isShopifyStandardUrl(params['*']);

  if (isStandardUrl) {
    // redirect to our custom urls
    switch (isStandardUrl.urlType) {
      case 'product':
        return new Response(null, {
          status: 301,
          headers: {
            location: `/my-products/${isStandardUrl.id}${
              isStandardUrl.searchParams
                ? `?${isStandardUrl.searchParams.toString()}`
                : "'"
            }`,
          },
        });

      case 'collection':
        return new Response(null, {
          status: 302,
          headers: {
            location: `/my-collections/${isStandardUrl.id}${
              isStandardUrl.searchParams
                ? `?${isStandardUrl.searchParams.toString()}`
                : "'"
            }`,
          },
        });
    }
  }

  // render the 404
  throw new Response('not found', {status: 404});
};

export default function Splat404Handler() {
  return <div>testings</div>;
}

type StandardUrl = {
  urlType: 'collection' | 'product';
  id: string;
  searchParams?: URLSearchParams;
};

// Would be moved into a Hydrogen package
function isShopifyStandardUrl(inputUrl?: string): StandardUrl | null {
  if (!inputUrl) {
    return null;
  }
  // we aren't going to use the base url part, so it can be whatever
  const url = new URL(inputUrl, 'https://example.com');

  const [, mainPath, mainPathId, secondaryPath, seccondaryPathId, ...rest] =
    url.pathname.split('/');

  let returnObj: StandardUrl | null = null;

  switch (mainPath) {
    case 'collections': {
      // handle this special case where products could be in the collections route
      if (secondaryPath === 'products') {
        returnObj = {
          urlType: 'product',
          id: seccondaryPathId,
        };
      } else {
        returnObj = {
          urlType: 'collection',
          id: mainPathId,
        };
      }
    }
  }

  if (returnObj && url.searchParams) {
    returnObj.searchParams = url.searchParams;
  }

  return returnObj;
}
