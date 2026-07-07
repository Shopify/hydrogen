import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

import { CollectionCard } from "@/components/CollectionCard";
import { ProductCard } from "@/components/ProductCard";
import { content } from "@/lib/content";
import { HOME_QUERY } from "@/lib/queries";
import { canonicalUrl } from "@/lib/site";
import { staticStorefrontClient } from "@/lib/storefront-static";

export const metadata: Metadata = {
  title: "CORE — Discover our latest collection",
  description: content.home.hero.subtitle,
  alternates: { canonical: "/" },
  openGraph: {
    title: "CORE — Discover our latest collection",
    description: content.home.hero.subtitle,
    type: "website",
    url: canonicalUrl("/"),
  },
  twitter: { card: "summary_large_image" },
};

/** Home catalog fetch — cached at the data boundary (F2: dynamic root layout
 *  precludes page-level prerender, so the cache-point is the fetch function). */
async function fetchHome() {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "collections");

  const { data, errors } = await staticStorefrontClient.graphql(HOME_QUERY);
  if (errors) {
    console.error("[hydrogen] Home query failed", errors);
  }
  return {
    featuredProducts: data?.featuredProducts?.nodes ?? [],
    featuredCollections: data?.featuredCollections?.nodes ?? [],
  };
}

type HomeData = Awaited<ReturnType<typeof fetchHome>>;
type ProductNode = HomeData["featuredProducts"][number];
type CollectionNode = HomeData["featuredCollections"][number];

export default async function HomePage() {
  const { featuredProducts, featuredCollections } = await fetchHome();

  return (
    <>
      <Hero />
      <BestSellers products={featuredProducts} />
      <ShopByCategory collections={featuredCollections} />
    </>
  );
}

function Hero() {
  // The hero is the LCP image (notes/home.md): eager + high fetch priority.
  // Unsplash is a third-party host, so it passes through `shopifyImageUrl`
  // unchanged — build a width-descriptor srcset directly from its `w=` param
  // and pair it with `sizes="100vw"` (F12). DPR `srcSetFor` is not used here:
  // `sizes` is a no-op for 1x/2x descriptors.
  const heroBaseUrl =
    "https://images.unsplash.com/photo-1653398597732-37fc919284dd?auto=format&fit=crop&q=80";
  const heroSrcSet = `${heroBaseUrl}&w=480 480w, ${heroBaseUrl}&w=1024 1024w, ${heroBaseUrl}&w=2000 2000w`;

  return (
    <section className="max-w-page px-margin mx-auto w-full">
      <div
        className="bleed-full min-h-hero relative overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="bg-surface-secondary absolute inset-0">
          <img
            src={`${heroBaseUrl}&w=2000`}
            srcSet={heroSrcSet}
            sizes="100vw"
            alt="A white chair beside a white wall"
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="overlay-dark pointer-events-none absolute inset-0" />
        <div className="max-w-page px-margin text-interactive-text min-h-hero relative z-10 mx-auto flex flex-col items-start justify-end p-8 pb-12">
          <h1 id="hero-heading" className="type-display mb-3 max-w-2xl">
            {content.home.hero.heading}
          </h1>
          <p className="type-body-lg mb-6 max-w-prose opacity-90">{content.home.hero.subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/collections"
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.home.hero.primaryCta}
            </Link>
            <Link
              href="/collections"
              className="rounded-button button-secondary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.home.hero.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BestSellers({ products }: { products: ProductNode[] }) {
  return (
    <section className="bg-surface w-full pt-20 pb-12">
      <div className="max-w-page px-margin mx-auto mb-4 flex items-center justify-between">
        <h2 className="type-heading-xl">{content.home.bestSellers}</h2>
        <Link
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
        </Link>
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

function ShopByCategory({ collections }: { collections: CollectionNode[] }) {
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
