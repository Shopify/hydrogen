import { gql } from "@shopify/hydrogen";
import { Suspense } from "react";

import { getStorefrontClient } from "@/lib/storefront";
import { ProductCard } from "./ProductCard";

const HOME_QUERY = gql(`
    query Home {
      products(first: 3) {
        nodes {
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  `);

export function ProductListShell() {
  return (
    <section className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1480px] px-6 text-center">
        <p className="text-sm font-medium tracking-wide text-black/70">New Arrivals</p>
        <h2 className="mt-4 text-6xl font-black tracking-tight md:text-8xl">Spring &apos;26</h2>
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList />
        </Suspense>
      </div>
    </section>
  );
}

export async function ProductList() {
  const storefrontClient = await getStorefrontClient();
  const { data } = await storefrontClient.graphql(HOME_QUERY);
  const products = data?.products?.nodes ?? [];
  return (
    <div className="mt-16 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.handle} product={product} />
      ))}
    </div>
  );
}

export function ProductListSkeleton() {
  return (
    <div className="mt-16 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="block">
          <div className="aspect-square animate-pulse overflow-hidden bg-neutral-100" />
          <div className="mt-5">
            <div className="h-5 w-2/3 animate-pulse bg-neutral-100" />
            <div className="mt-1 h-4 w-16 animate-pulse bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
