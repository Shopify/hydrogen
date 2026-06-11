import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { ProductCard } from "../components/ProductCard";
import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/home";

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

export function meta() {
  return [{ title: "Mock.shop — Hydrogen" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await storefrontClient.graphql(HOME_QUERY);
  const products = data?.products?.nodes ?? [];
  return { products };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { products } = loaderData;

  return (
    <main>
      <section className="grid grid-cols-1 md:grid-cols-2">
        <Link
          to="/collections/men"
          className="group relative block aspect-[4/5] overflow-hidden bg-neutral-900"
        >
          <img
            src="https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenHoodie02.jpg?v=1739549220"
            alt="New arrivals"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              New arrivals
            </h2>
          </div>
        </Link>
        <Link
          to="/collections/men"
          className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100"
        >
          <img
            src="https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenSweatpants01.jpg?v=1675455387"
            alt="Midweight Classics"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Midweight Classics
            </h2>
          </div>
        </Link>
      </section>

      <section className="bg-paper py-24 md:py-32">
        <div className="mx-auto max-w-[1480px] px-6 text-center">
          <p className="text-sm font-medium tracking-wide text-black/70">New Arrivals</p>
          <h2 className="mt-4 text-6xl font-black tracking-tight md:text-8xl">Spring '26</h2>
          <div className="mt-16 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.handle} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
