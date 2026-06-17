import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
import Link from "next/link";

import { getStorefrontClient } from "@/lib/storefront";
import { CartButton } from "./CartButton";

async function getHeaderCollections() {
  const storefrontClient = await getStorefrontClient();
  const { data } = await storefrontClient.graphql(HEADER_COLLECTIONS_QUERY);
  return normalizeHeaderCollections(data?.collections?.nodes);
}

export async function Header() {
  const collections = await getHeaderCollections();

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto grid h-16 max-w-[1480px] grid-cols-3 items-center px-6">
        <nav className="flex items-center gap-6 text-sm font-semibold">
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/collections/${collection.handle}`}
              className="hover:opacity-60"
            >
              {collection.title}
            </Link>
          ))}
          <Link href="/collections" className="hover:opacity-60">
            Collections
          </Link>
          <Link href="/blogs/news" className="hover:opacity-60">
            News
          </Link>
        </nav>
        <Link href="/" className="justify-self-center text-lg font-black tracking-tight">
          MOCK.SHOP
        </Link>
        <div className="flex items-center justify-end gap-5">
          <form method="get" action="/search" role="search" className="flex items-center gap-1">
            <input
              type="search"
              name="q"
              aria-label="Search products"
              placeholder="Search"
              className="w-28 rounded border border-black/15 px-2 py-1 text-sm transition-[width] focus:w-44 focus:outline-none"
            />
            <button type="submit" aria-label="Search" className="hover:opacity-60">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>
          <Link href="/" aria-label="Account" className="hover:opacity-60">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
