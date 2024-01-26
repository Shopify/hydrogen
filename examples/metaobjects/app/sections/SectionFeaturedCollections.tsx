import type {
  SectionFeaturedCollectionsFragment,
  FeaturedCollectionImageFragment,
} from 'storefrontapi.generated';
import {parseSection} from '~/utils/parseSection';
import type {ParsedMetafields} from '@shopify/hydrogen';
import {Image} from '@shopify/hydrogen';

export function SectionFeaturedCollections(
  props: SectionFeaturedCollectionsFragment,
) {
  const section = parseSection<
    SectionFeaturedCollectionsFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {id, heading, collections} = section;
  return (
    <section className="featured-collection" key={id}>
      {heading && <h2>{heading.parsedValue}</h2>}
      {collections?.nodes && (
        <ul className="recommended-products-grid">
          {collections.nodes.map((collection) => (
            <li key={collection.id}>
              <a href={`/collections/${collection.handle}`}>
                <Image
                  style={{height: 'auto', width: 400}}
                  aspectRatio="1/1"
                  data={collection.image as FeaturedCollectionImageFragment}
                />
                <h5>{collection.title}</h5>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const FEATURED_COLLECTION_FRAGMENT = `#graphql
  fragment FeaturedCollectionImage on Image {
    altText
    width
    height
    url
  }

  fragment FeaturedCollection on Collection {
    id
    title
    handle
    image {
      ...FeaturedCollectionImage
    }
  }
`;

export const SECTION_FEATURED_COLLECTIONS_FRAGMENT = `#graphql
  fragment SectionFeaturedCollectionsField on MetaobjectField {
    type
    key
    value
  }
  fragment SectionFeaturedCollections on Metaobject {
    type
    id
    heading: field(key: "heading") {
      ...SectionFeaturedCollectionsField
    }
    collections: field(key: "collections") {
      references(first: 10) {
        nodes {
          ... on Collection {
            ...FeaturedCollection
          }
        }
      }
    }
    withCollectionTitles: field(key: "with_collection_titles") {
     ...SectionFeaturedCollectionsField
    }
  }
  ${FEATURED_COLLECTION_FRAGMENT}
`;

/*
function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}
*/
