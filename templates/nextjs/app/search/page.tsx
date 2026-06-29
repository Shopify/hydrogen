import type { Metadata } from "next";

import { SearchPageClient } from "../components/SearchPageClient";
import { loadSearchPage } from "../lib/search";
import { toURLSearchParams, type NextSearchParams } from "../lib/url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search products.",
};

type SearchPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const urlSearch = toURLSearchParams(await searchParams);
  const data = await loadSearchPage({ searchParams: urlSearch });

  return <SearchPageClient data={data} />;
}
