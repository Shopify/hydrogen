import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from '@remix-run/react';
import type {SectionStoresFragment} from 'storefrontapi.generated';

export function SectionStores(props: SectionStoresFragment) {
  const section = parseSection<
    SectionStoresFragment,
    // override metafields types that have been parsed
    {
      heading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {heading, stores} = section;

  return (
    <section className="section-stores">
      {heading?.value && <h1>{heading.value}</h1>}
      <div
        className="stores"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gridGap: '1rem',
        }}
      >
        {stores &&
          stores.nodes.map((store) => {
            if (!store) {
              return null;
            }
            const {image, heading, address} = store;
            return (
              <Link key={store.id} to={`/stores/${store.handle}`}>
                {image?.image?.url && (
                  <img
                    width={400}
                    src={image.image.url}
                    alt={image.image.altText || ''}
                  />
                )}
                {heading && (
                  <h2 style={{marginBottom: '.25rem', marginTop: '1rem'}}>
                    {heading.value}
                  </h2>
                )}
                {address && <address>{address?.value}</address>}
              </Link>
            );
          })}
      </div>
    </section>
  );
}

const STORE_ITEM_FRAGMENT = `#graphql
  fragment StoreItemField on MetaobjectField {
    type
    key
    value
  }
  fragment StoreItemImage on MediaImage {
    image {
      altText
      url(transform: {maxWidth: 600, maxHeight: 600})
      width
      height
    }
  }

  fragment StoreItem on Metaobject {
    type
    id
    handle
    heading: field(key: "heading") {
      ...StoreItemField
    }
    address: field(key: "address") {
      ...StoreItemField
    }
    image: field(key: "image") {
      key
      reference {
        ... on MediaImage {
          ...StoreItemImage
        }
      }
    }
}
`;

export const SECTION_STORES_FRAGMENT = `#graphql
  fragment SectionStores on Metaobject {
    type
    heading: field(key: "heading") {
      ...StoreItemField
    }
    stores: field(key: "stores") {
      references(first: 10) {
        nodes {
          ...StoreItem
        }
      }
    }
  }
  ${STORE_ITEM_FRAGMENT} `;
