import {
  json,
  type MetaFunction,
  type SerializeFrom,
  type LoaderArgs,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { ProductConnection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import invariant from "tiny-invariant";
import { PageHeader, Section, Text } from "~/components";
import { ProductGrid } from "~/components/ProductGrid";
import { getCollection } from "~/data";

export async function loader({ params, request }: LoaderArgs) {
  const { handle } = params;

  invariant(handle, "Missing collection handle param");

  const searchParams = new URL(request.url).searchParams;

  const cursor = searchParams.get("cursor") ?? undefined;
  const direction =
    searchParams.get("direction") === "previous" ? "previous" : "next";

  return json({
    collection: await getCollection({
      handle,
      pageBy: 4,
      direction,
      cursor,
      params,
    })
  });
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.collection?.seo?.title ?? "Collection",
    description: data?.collection?.seo?.description,
  };
};

export default function Collection() {
  const { collection } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHeader heading={collection.title}>
        {collection?.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}
      </PageHeader>
      <Section id="product-grid-section">
        <ProductGrid
          key={collection.id}
          products={collection.products as ProductConnection}
        />
      </Section>
    </>
  );
}
