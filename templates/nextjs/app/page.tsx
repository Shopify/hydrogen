import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import {
  CollectionCard,
  COLLECTION_CARD_FRAGMENT,
  type CollectionCardData,
} from "./components/CollectionCard";
import { ProductCard, PRODUCT_CARD_FRAGMENT, type ProductCardData } from "./components/ProductCard";
import { getStorefrontClient } from "./lib/storefront";

const HERO = {
  heading: "Discover our latest collection",
  subtitle: "Explore our curated selection of premium products",
  image: {
    url: "https://images.unsplash.com/photo-1653398597732-37fc919284dd?auto=format&fit=crop&w=2000&q=80",
    altText: "A white chair beside a white wall",
  },
  primaryCta: { label: "Shop now", href: "/collections" },
  secondaryCta: { label: "Learn more", href: "#" },
} as const;

export const HOME_QUERY = gql(
  `
    query Home {
      products(first: 8, sortKey: BEST_SELLING) {
        nodes {
          ...ProductCard
        }
      }
      collections(first: 3) {
        nodes {
          ...CollectionCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

type HomeQuery = StorefrontApi.ResultOf<typeof HOME_QUERY>;

type HomePageData = {
  featuredProducts: ProductCardData[];
  featuredCollections: CollectionCardData[];
};

async function loadHomePage(): Promise<HomePageData> {
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(HOME_QUERY);
  const home = data as HomeQuery | null | undefined;

  return {
    featuredProducts: home?.products.nodes ?? [],
    featuredCollections: home?.collections.nodes ?? [],
  };
}

export default async function HomePage() {
  const { featuredProducts, featuredCollections } = await loadHomePage();

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <section className="max-w-page px-margin mx-auto w-full">
        <div
          className="bleed-full min-h-hero relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div className="bg-surface-secondary absolute inset-0">
            <img
              src={HERO.image.url}
              alt={HERO.image.altText}
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <div className="overlay-dark pointer-events-none absolute inset-0" />
          <div className="max-w-page px-margin text-interactive-text min-h-hero relative z-10 mx-auto flex flex-col items-start justify-end p-8 pb-12">
            <h1 id="hero-heading" className="type-display mb-3 max-w-2xl">
              {HERO.heading}
            </h1>
            <p className="type-body-lg mb-6 max-w-prose opacity-90">{HERO.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={HERO.primaryCta.href}
                className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              >
                {HERO.primaryCta.label}
              </Link>
              <a
                href={HERO.secondaryCta.href}
                className="rounded-button button-secondary focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              >
                {HERO.secondaryCta.label}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface w-full pt-20 pb-12" aria-labelledby="best-sellers-heading">
        <div className="max-w-page px-margin mx-auto mb-4 flex items-center justify-between gap-4">
          <h2 id="best-sellers-heading" className="type-heading-xl">
            Best sellers
          </h2>
          <Link
            href="/collections"
            className="min-h-touch-target text-on-surface focus-visible:outline-accent inline-flex items-center gap-1 rounded-sm text-sm font-normal no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
          >
            <span>View all</span>
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

        {featuredProducts.length > 0 ? (
          <div className="max-w-page px-margin mx-auto contain-paint">
            <ul
              role="list"
              className="grid grid-cols-1 gap-x-1 gap-y-10 md:grid-cols-2 lg:grid-cols-4"
            >
              {featuredProducts.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="w-full py-12" aria-labelledby="category-heading">
        <h2 id="category-heading" className="type-heading-xl max-w-page px-margin mx-auto mb-4">
          Shop by category
        </h2>
        {featuredCollections.length > 0 ? (
          <ul role="list" className="max-w-page px-margin mx-auto grid grid-cols-1 md:grid-cols-3">
            {featuredCollections.map((collection) => (
              <li key={collection.handle}>
                <CollectionCard collection={collection} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
