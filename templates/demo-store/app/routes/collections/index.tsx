import {
  json,
  type LoaderArgs,
  type MetaFunction,
} from '@shopify/hydrogen-remix';
import {useLoaderData} from '@remix-run/react';
import type {
  Collection,
  CollectionConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import {Grid, Heading, PageHeader, Section, Link} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';

const PAGINATION_SIZE = 8;

export const loader = async ({context: {storefront}}: LoaderArgs) => {
  console.log('>>>> RAN LOADER');
  const {collections} = await storefront.query<{
    collections: CollectionConnection;
  }>(COLLECTIONS_QUERY, {
    variables: {
      pageBy: PAGINATION_SIZE,
    },
  });

  return json({collections: collections.nodes});
};

export const meta: MetaFunction = () => {
  return {
    title: 'All Collections',
  };
};

export default function Collections() {
  console.log('>>>> RAN COLLECTIONS');
  const {collections} = useLoaderData<typeof loader>();

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
  loading?: HTMLImageElement['loading'];
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

const COLLECTIONS_QUERY = `#graphql
  query Collections(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
  ) @inContext(country: $country, language: $language) {
    collections(first: $pageBy) {
      nodes {
        id
        title
        description
        handle
        seo {
          description
          title
        }
        image {
          id
          url
          width
          height
          altText
        }
      }
    }
  }
`;
