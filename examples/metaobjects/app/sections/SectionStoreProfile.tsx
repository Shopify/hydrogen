import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from '@remix-run/react';
import type {SectionStoreProfileFragment} from 'storefrontapi.generated';
import {Key, ReactElement, JSXElementConstructor, ReactNode} from 'react';

export function SectionStoreProfile(props: SectionStoreProfileFragment) {
  const section = parseSection<
    SectionStoreProfileFragment,
    // override metafields types that have been parsed
    {
      store: {
        hours?: ParsedMetafields['list.single_line_text_field'];
      };
    }
  >(props);

  const {image, heading, description, hours, address} = section.store;

  return (
    <section id={props.id} className="store">
      <Link to={`/stores`}>Back to Stores</Link>
      <div>
        <br />
        {image?.image?.url && (
          <img
            width={800}
            src={image.image.url}
            alt={image?.image?.altText || ''}
          />
        )}
      </div>
      {heading && <h1>{heading.value}</h1>}
      {description && <p>{description.value}</p>}
      <br />
      <div>
        <h5>Address</h5>
        {address && <address>{address.value}</address>}
      </div>
      {hours?.parsedValue && (
        <div>
          <br />
          <h5>Opening Hours</h5>
          {hours.parsedValue.map((day: string) => (
            <p key={day}>{day}</p>
          ))}
        </div>
      )}
    </section>
  );
}

export const STORE_PROFILE_FRAGMENT = `#graphql
  fragment StoreProfileField on MetaobjectField {
    type
    key
    value
  }

  fragment StoreProfile on Metaobject {
    type
    id
    handle
    title: field(key: "title") {
      ...StoreProfileField
    }
    heading: field(key: "heading") {
      ...StoreProfileField
    }
    description: field(key: "description") {
      ...StoreProfileField
    }
    address: field(key: "address") {
      ...StoreProfileField
    }
    hours: field(key: "hours") {
      ...StoreProfileField
    }
    image: field(key: "image") {
      type
      key
      reference {
        ... on MediaImage {
          image {
            altText
            url
            width
            height
          }
        }
      }
    }
  }
`;

export const SECTION_STORE_PROFILE_FRAGMENT = `#graphql
  fragment SectionStoreProfile on Metaobject {
    type
    id
    handle
    store: field(key: "store") {
       reference {
          ...on Metaobject {
            ...StoreProfile
          }
       }
    }
  }
  ${STORE_PROFILE_FRAGMENT}
`;
