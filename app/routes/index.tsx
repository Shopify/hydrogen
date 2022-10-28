import {type LoaderArgs, defer, type MetaFunction} from '@hydrogen/remix';
import {Suspense} from 'react';
import {Await, useLoaderData} from '@remix-run/react';
import {ProductSwimlane, FeaturedCollections, Hero} from '~/components';
import {COLLECTION_CONTENT_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data';
import {getHeroPlaceholder} from '~/lib/placeholders';
import {getLocalizationFromLang} from '~/lib/utils';
import type {
  Collection,
  CollectionConnection,
  Metafield,
  ProductConnection,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

interface HomeSeoData {
  shop: {
    name: string;
    description: string;
  };
}

interface CollectionHero {
  byline: Metafield;
  cta: Metafield;
  handle: string;
  heading: Metafield;
  height?: 'full';
  loading?: 'eager' | 'lazy';
  spread: Metafield;
  spreadSecondary: Metafield;
  top?: boolean;
}

export async function loader({params, context: {storefront}}: LoaderArgs) {
  const {language, country} = getLocalizationFromLang(params.lang);

  if (
    params.lang &&
    language === 'EN' &&
    country === 'US' &&
    params.lang !== 'EN-US'
  ) {
    // If the lang URL param is defined, yet we still are on `EN-US`
    // the the lang param must be invalid, send to the 404 page
    throw new Response('Not found', {status: 404});
  }

  const {shop, hero} = await storefront.query<{
    hero: CollectionHero;
    shop: HomeSeoData;
  }>({
    query: HOMEPAGE_SEO_QUERY,
    variables: {
      language,
      country,
      handle: 'freestyle',
    },
  });

  return defer({
    shop,
    primaryHero: hero,
    // @feedback
    // Should these all be deferred? Can any of them be combined?
    // Should there be fallback rendering while deferred?
    featuredProducts: storefront.query<{
      products: ProductConnection;
    }>({
      query: HOMEPAGE_FEATURED_PRODUCTS_QUERY,
      variables: {
        language,
        country,
      },
    }),
    secondaryHero: storefront.query<{hero: CollectionHero}>({
      query: COLLECTION_HERO_QUERY,
      variables: {
        language,
        country,
        handle: 'backcountry',
      },
    }),
    featuredCollections: storefront.query<{
      collections: CollectionConnection;
    }>({
      query: FEATURED_COLLECTIONS_QUERY,
      variables: {
        language,
        country,
      },
    }),
    tertiaryHero: storefront.query<{hero: CollectionHero}>({
      query: COLLECTION_HERO_QUERY,
      variables: {
        language,
        country,
        handle: 'winter-2022',
      },
    }),
  });
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

  // TODO: analytics
  // useServerAnalytics({
  //   shopify: {
  //     pageType: ShopifyAnalyticsConstants.pageType.home,
  //   },
  // });

  return (
    <>
      {primaryHero && (
        <Hero {...primaryHero} height="full" top loading="eager" />
      )}

      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {({products}) => {
              if (!products?.nodes) return null;
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
              if (!hero) return null;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}

      {featuredCollections && (
        <Suspense>
          <Await resolve={featuredCollections}>
            {({collections}) => {
              if (!collections?.nodes) return null;
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
              if (!hero) return null;
              return <Hero {...hero} />;
            }}
          </Await>
        </Suspense>
      )}
    </>
  );
}

const HOMEPAGE_SEO_QUERY = `#graphql
  ${COLLECTION_CONTENT_FRAGMENT}
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
`;

const COLLECTION_HERO_QUERY = `#graphql
  ${COLLECTION_CONTENT_FRAGMENT}
  query collectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
  }
`;

// @see: https://shopify.dev/api/storefront/latest/queries/products
export const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

// @see: https://shopify.dev/api/storefront/latest/queries/collections
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
