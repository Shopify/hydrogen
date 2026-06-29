import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionPageClient } from "../../components/CollectionPageClient";
import { loadCollectionPage } from "../../lib/collection";
import { toURLSearchParams, type NextSearchParams } from "../../lib/url";

export const dynamic = "force-dynamic";

type CollectionPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<NextSearchParams>;
};

async function loadOrNotFound(handle: string, searchParams: URLSearchParams) {
  try {
    return await loadCollectionPage({ handle, searchParams });
  } catch (error) {
    if (error instanceof Response && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;

  try {
    const data = await loadCollectionPage({ handle, searchParams: new URLSearchParams() });
    return {
      title: data.collection.seo.title ?? data.collection.title,
      description: data.collection.seo.description ?? data.collection.description,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 404) return {};
    throw error;
  }
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { handle } = await params;
  const urlSearch = toURLSearchParams(await searchParams);
  const data = await loadOrNotFound(handle, urlSearch);

  return <CollectionPageClient data={data} />;
}
