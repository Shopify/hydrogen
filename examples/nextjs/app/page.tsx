import Link from "next/link";

import { ProductListShell } from "@/components/ProductList";

export default function HomePage() {
  return (
    <main>
      <section className="grid grid-cols-1 md:grid-cols-2">
        <Link
          href="/collections/men"
          className="group relative block aspect-[4/5] overflow-hidden bg-neutral-900"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
          href="/collections/men"
          className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <ProductListShell />
    </main>
  );
}
