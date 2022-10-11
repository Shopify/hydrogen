import {
  type LoaderArgs,
  type MetaFunction,
  defer,
} from "@remix-run/cloudflare";
import { Suspense } from "react";
import { Await, useLoaderData } from "@remix-run/react";
import { ProductSwimlane, FeaturedCollections, Hero } from "~/components";
import {
  getHomeSeoData,
  getCollectionHeroData,
  getFeaturedCollectionData,
  getFeaturedProductsData,
} from "~/data";
import { getHeroPlaceholder } from "~/lib/placeholders";

export async function loader({ params }: LoaderArgs) {
  const [shop, primaryHero] = await Promise.all([
    getHomeSeoData({ params }),
    getCollectionHeroData({ params, handle: "freestyle" }),
  ]);

  return defer({
    shop,
    primaryHero,
    featuredProducts: getFeaturedProductsData({ params }),
    secondaryHero: getCollectionHeroData({ params, handle: "backcountry" }),
    featuredCollections: getFeaturedCollectionData({ params }),
    tertiaryHero: getCollectionHeroData({ params, handle: "winter-2022" }),
  });
}

export const meta: MetaFunction = ({ data }) => {
  return {
    title: data?.shop?.name,
    description: data?.shop?.description,
  };
};

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
            {(products) => {
              if (!products) return null;
              return (
                <ProductSwimlane
                  products={products}
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
            {(secondaryHero) => {
              if (!secondaryHero) return null;
              return <Hero {...secondaryHero} />;
            }}
          </Await>
        </Suspense>
      )}

      {featuredCollections && (
        <Suspense>
          <Await resolve={featuredCollections}>
            {(collections) => {
              if (!collections) return null;
              return (
                <FeaturedCollections
                  collections={collections}
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
            {(tertiaryHero) => {
              if (!tertiaryHero) return null;
              return <Hero {...tertiaryHero} />;
            }}
          </Await>
        </Suspense>
      )}
    </>
  );
}
