import { json, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import type { Collection } from "@shopify/hydrogen-ui-alpha/storefront-api-types";
import { Grid, Heading, PageHeader, Section } from "~/components";
import { getCollections } from "~/data";
import { getImageLoadingPriority } from "~/lib/const";

export const loader = async () => {
  const collections = await getCollections();

  return json({ collections });
};

export const meta: MetaFunction = () => {
  return {
    title: "All Collections",
  };
};

export default function Collections() {
  const { collections } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="Collections" />
      <Section>
        <Grid items={collections.length === 3 ? 3 : 2}>
          {collections.map((collection, i) => (
            <CollectionCard
              collection={collection as Collection}
              key={collection.id}
              loading={getImageLoadingPriority(i, 2)}
            />
          ))}
        </Grid>
      </Section>
    </>
  );
}

function CollectionCard({
  collection,
  loading,
}: {
  collection: Collection;
  loading?: HTMLImageElement["loading"];
}) {
  return (
    <Link to={`/collections/${collection.handle}`} className="grid gap-4">
      <div className="card-image bg-primary/5 aspect-[3/2]">
        {collection?.image && (
          <img
            alt={collection.title}
            src={collection.image.url}
            height={400}
            sizes="(max-width: 32em) 100vw, 33vw"
            width={600}
            loading={loading}
          />
        )}
      </div>
      <Heading as="h3" size="copy">
        {collection.title}
      </Heading>
    </Link>
  );
}
