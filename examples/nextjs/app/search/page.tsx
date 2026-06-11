import type { Metadata } from "next";

import { CollectionBrowser } from "../components/CollectionBrowser";
import { querySearch } from "../lib/search";
import { getStorefrontClient } from "../lib/storefront";
import { pageSearchParamsToUrlSearchParams, type PageSearchParams } from "../lib/url";

type Props = {
  searchParams: PageSearchParams;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const urlSearchParams = await pageSearchParamsToUrlSearchParams(searchParams);
  const term = urlSearchParams.get("q")?.trim();

  return {
    title: term ? `Search results for "${term}" — Mock.shop` : "Search — Mock.shop",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const urlSearchParams = await pageSearchParamsToUrlSearchParams(searchParams);
  const storefrontClient = await getStorefrontClient();
  const result = await querySearch({
    storefrontClient,
    searchParams: urlSearchParams,
  });

  return (
    <CollectionBrowser
      mode="search"
      term={result.term}
      dataSearch={urlSearchParams.toString()}
      products={result.products}
      availableFilters={result.availableFilters}
      totalCount={result.totalCount}
    />
  );
}
