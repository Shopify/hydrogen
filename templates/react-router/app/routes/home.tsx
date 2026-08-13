import { Cache, gql } from "@shopify/hydrogen";
import type { MetaFunction } from "react-router";

import { CollectionCard } from "~/components/CollectionCard";
import { ProductCard } from "~/components/ProductCard";
import { content } from "~/lib/content";
import { PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT } from "~/lib/fragments";
import { shopifyImageUrl } from "~/lib/image";
import { shopNameFromMatches, shopTitle, siteOriginFromMatches } from "~/lib/meta";
import { canonicalUrl } from "~/lib/site";
import { storefrontClientContext } from "~/lib/storefront-context";

import type { Route } from "./+types/home";

const HOME_QUERY = gql(
  `
  query Home($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    featuredProducts: products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
    featuredCollections: collections(first: 3) {
      nodes {
        ...CollectionCard
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

export const meta: MetaFunction = ({ matches }) => {
  const shopName = shopNameFromMatches(matches);
  const siteOrigin = siteOriginFromMatches(matches);
  const title = shopTitle(content.home.hero.heading, shopName);
  return [
    { title },
    { name: "description", content: content.home.hero.subtitle },
    { tagName: "link", rel: "canonical", href: canonicalUrl("/", siteOrigin) },
    { property: "og:title", content: title },
    { property: "og:description", content: content.home.hero.subtitle },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonicalUrl("/", siteOrigin) },
    { name: "twitter:card", content: "summary_large_image" },
  ];
};

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data, errors } = await storefrontClient.graphql(HOME_QUERY, {
    cache: Cache.short(),
  });

  if (errors) {
    console.error("[hydrogen] Home query failed", errors);
  }

  return {
    featuredProducts: data?.featuredProducts?.nodes ?? [],
    featuredCollections: data?.featuredCollections?.nodes ?? [],
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const products = loaderData.featuredProducts;
  const collections = loaderData.featuredCollections;

  return (
    <>
      <Hero collection={collections[0]} />
      <BestSellers products={products} />
      <ShopByCategory collections={collections} />
    </>
  );
}

type HeroCollection = Route.ComponentProps["loaderData"]["featuredCollections"][number];

type HeroImageData = { url: string; altText?: string | null };

function HeroImage({ image }: { image: HeroImageData | null }) {
  if (!image) return null;

  // The hero is the LCP image (notes/home.md): eager + high fetch priority.
  // Width-descriptor srcset + `sizes="100vw"` (F12); DPR `srcSetFor` is not
  // used here because `sizes` is a no-op for 1x/2x descriptors.
  const srcSet = [480, 1024, 2000]
    .map((width) => `${shopifyImageUrl(image.url, { width })} ${width}w`)
    .join(", ");

  return (
    <img
      src={shopifyImageUrl(image.url, { width: 2000 })}
      srcSet={srcSet}
      sizes="100vw"
      alt={image.altText ?? ""}
      className="h-full w-full object-cover"
      loading="eager"
      fetchPriority="high"
    />
  );
}

function Hero({ collection }: { collection: HeroCollection | undefined }) {
  const heading = collection?.title ?? content.home.hero.heading;
  const subtitle = collection?.description || content.home.hero.subtitle;
  const shopHref = collection ? `/collections/${collection.handle}` : "/collections";
  const image = collection?.image ?? collection?.products.nodes[0]?.featuredImage ?? null;

  return (
    <section className="max-w-page px-margin mx-auto w-full">
      <div
        className="bleed-full min-h-hero relative overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="bg-surface-secondary absolute inset-0">
          <HeroImage image={image} />
        </div>
        <div className="overlay-dark pointer-events-none absolute inset-0" />
        <div className="max-w-page px-margin text-interactive-text min-h-hero relative z-10 mx-auto flex flex-col items-start justify-end p-8 pb-12">
          <h1 id="hero-heading" className="type-display mb-3 max-w-2xl">
            {heading}
          </h1>
          <p className="type-body-lg mb-6 max-w-prose opacity-90">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={shopHref}
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.home.hero.primaryCta}
            </a>
            <a
              href="/collections"
              className="rounded-button button-secondary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.home.hero.secondaryCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BestSellers({
  products,
}: {
  products: Route.ComponentProps["loaderData"]["featuredProducts"];
}) {
  return (
    <section className="bg-surface w-full pt-20 pb-12">
      <div className="max-w-page px-margin mx-auto mb-4 flex items-center justify-between">
        <h2 className="type-heading-xl">{content.home.bestSellers}</h2>
        <a
          href="/collections"
          className="min-h-touch-target text-on-surface focus-visible:outline-accent inline-flex items-center gap-1 rounded-sm text-sm font-normal no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
        >
          <span>{content.home.viewAll}</span>
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </a>
      </div>

      <div className="max-w-page px-margin mx-auto contain-paint">
        <ul role="list" className="grid grid-cols-1 gap-x-1 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ShopByCategory({
  collections,
}: {
  collections: Route.ComponentProps["loaderData"]["featuredCollections"];
}) {
  return (
    <section className="w-full py-12" aria-labelledby="category-heading">
      <h2 id="category-heading" className="type-heading-xl max-w-page px-margin mx-auto mb-4">
        {content.home.shopByCategory}
      </h2>
      <ul role="list" className="max-w-page px-margin mx-auto grid grid-cols-1 md:grid-cols-3">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionCard collection={collection} loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  );
}
