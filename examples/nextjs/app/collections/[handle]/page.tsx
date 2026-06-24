import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionBrowser } from "@/components/CollectionBrowser";
import { CollectionViewedTracker } from "@/components/CollectionViewedTracker";
import { queryCollection } from "@/lib/collection";
import { getStorefrontClient } from "@/lib/storefront";
import { pageSearchParamsToUrlSearchParams, type PageSearchParams } from "@/lib/url";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: PageSearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const storefrontClient = await getStorefrontClient();
  const result = await queryCollection({
    storefrontClient,
    handle,
    searchParams: new URLSearchParams(),
  });
  const title = result?.collection.title ?? "Collection";
  return { title: `${title} — Mock.shop` };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const urlSearchParams = await pageSearchParamsToUrlSearchParams(searchParams);
  const storefrontClient = await getStorefrontClient();
  const result = await queryCollection({
    storefrontClient,
    handle,
    searchParams: urlSearchParams,
  });
  if (!result) {
    notFound();
  }

  return (
    <>
      <CollectionViewedTracker collection={result.collection} />
      <CollectionBrowser
        mode="collection"
        title={result.collection.title ?? ""}
        description={result.collection.description}
        handle={result.collection.handle}
        dataSearch={urlSearchParams.toString()}
        products={result.products}
        availableFilters={result.availableFilters}
      />
    </>
  );
}
