import {Await, useLoaderData} from '@remix-run/react';
import {AnalyticsPageType} from '@shopify/hydrogen';
import type {
  CollectionConnection,
  ProductConnection,
} from '@shopify/hydrogen/storefront-api-types';
import {
  type ActionArgs,
  defer,
  json,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import {Suspense} from 'react';
import {verifyMessage} from 'viem';

import {ProductSwimlane, FeaturedCollections, Hero} from '~/components';
import {type CollectionHero} from '~/components/Hero';
import {routeHeaders, CACHE_SHORT} from '~/data/cache';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {clearContextAttributes} from '~/lib/attributes.server';
import {getHeroPlaceholder} from '~/lib/placeholders';
import {seoPayload} from '~/lib/seo.server';
import {walletSession, isWallet} from '~/lib/wallet.server';

interface HomeSeoData {
  shop: {
    name: string;
    description: string;
  };
}

export const headers = routeHeaders;

export async function action({context, request}: ActionArgs) {
  const {clear, commit, setWallet} = await walletSession(request);
  const stringifiedWallet = (await request.formData()).get('wallet');

  async function clearFunction() {
    clear();

    /**
     * Clear any attributes on the cart to ensure that the cart no longer
     * has any gate context that would unlock gates which should no longer
     * be unlocked.
     */
    await clearContextAttributes({context, request});

    return json(
      {revalidate: true},
      {
        headers: {
          'Set-Cookie': await commit(),
        },
      },
    );
  }

  if (!stringifiedWallet) {
    return await clearFunction();
  }

  // Set the wallet data in our cookie using the walletSession
  // functions we created earlier
  const wallet = JSON.parse(stringifiedWallet as string);

  // Ensure that the wallet provided is a valid wallet
  if (!isWallet(wallet)) {
    return await clearFunction();
  }

  /**
   * While the `@shopify/connect-wallet` package does verify the signature before
   * adding it to the state and providing it back to the application, it's still
   * good to ensure that wallets submitted to this action route are sanitized.
   *
   * [`verifyMessage` documentation](https://viem.sh/docs/utilities/verifyMessage.html)
   */
  const valid = await verifyMessage({
    address: wallet.address,
    message: wallet.message!,
    signature: wallet.signature!,
  });

  if (!valid) {
    throw json(
      {message: 'Invalid authentication data provided.'},
      {status: 401},
    );
  }

  setWallet(wallet);

  return json(
    {},
    {
      headers: {
        'Set-Cookie': await commit(),
      },
    },
  );
}

export async function loader({params, context}: LoaderArgs) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are on `EN-US`
    // the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  const {shop, hero} = await context.storefront.query<{
    hero: CollectionHero;
    shop: HomeSeoData;
  }>(HOMEPAGE_SEO_QUERY, {
    variables: {handle: 'freestyle'},
  });

  const seo = seoPayload.home();

  return defer(
    {
      shop,
      primaryHero: hero,
      // These different queries are separated to illustrate how 3rd party content
      // fetching can be optimized for both above and below the fold.
      featuredProducts: context.storefront.query<{
        products: ProductConnection;
      }>(HOMEPAGE_FEATURED_PRODUCTS_QUERY, {
        variables: {
          /**
           * Country and language properties are automatically injected
           * into all queries. Passing them is unnecessary unless you
           * want to override them from the following default:
           */
          country,
          language,
        },
      }),
      secondaryHero: context.storefront.query<{hero: CollectionHero}>(
        COLLECTION_HERO_QUERY,
        {
          variables: {
            handle: 'backcountry',
            country,
            language,
          },
        },
      ),
      featuredCollections: context.storefront.query<{
        collections: CollectionConnection;
      }>(FEATURED_COLLECTIONS_QUERY, {
        variables: {
          country,
          language,
        },
      }),
      tertiaryHero: context.storefront.query<{hero: CollectionHero}>(
        COLLECTION_HERO_QUERY,
        {
          variables: {
            handle: 'winter-2022',
            country,
            language,
          },
        },
      ),
      analytics: {
        pageType: AnalyticsPageType.home,
      },
      seo,
    },
    {
      headers: {
        'Cache-Control': CACHE_SHORT,
      },
    },
  );
}

export default function Homepage() {
  const {
    primaryHero,
    secondaryHero,
    tertiaryHero,
    featuredCollections,
    featuredProducts,
  } = useLoaderData<typeof loader>();

  // TODO: skeletons vs placeholders
  const skeletons = getHeroPlaceholder([{}, {}, {}]);

  return (
    <>
      {primaryHero && (
        <Hero {...primaryHero} height="full" top loading="eager" />
      )}

      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {({products}) => {
              if (!products?.nodes) return <></>;
              return (
                <ProductSwimlane
                  products={products.nodes}
                  title="Featured Products"
                  count={4}
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      {secondaryHero && (
        <Suspense fallback={<Hero {...skeletons[1]} />}>
          <Await resolve={secondaryHero}>
            {({hero}) => {
              if (!hero) return <></>;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}

      {featuredCollections && (
        <Suspense>
          <Await resolve={featuredCollections}>
            {({collections}) => {
              if (!collections?.nodes) return <></>;
              return (
                <FeaturedCollections
                  collections={collections.nodes}
                  title="Collections"
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      {tertiaryHero && (
        <Suspense fallback={<Hero {...skeletons[2]} />}>
          <Await resolve={tertiaryHero}>
            {({hero}) => {
              if (!hero) return <></>;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}
    </>
  );
}

const COLLECTION_CONTENT_FRAGMENT = `#graphql
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const HOMEPAGE_SEO_QUERY = `#graphql
  query collectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
    shop {
      name
      description
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

const COLLECTION_HERO_QUERY = `#graphql
  query collectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/2023-04/queries/products
export const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/2023-04/queries/collections
export const FEATURED_COLLECTIONS_QUERY = `#graphql
  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(
      first: 4,
      sortKey: UPDATED_AT
    ) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
  }
`;
