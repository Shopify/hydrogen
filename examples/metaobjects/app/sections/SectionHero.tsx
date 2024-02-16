import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from '@remix-run/react';
import type {SectionHeroFragment} from 'storefrontapi.generated';

export function SectionHero(props: SectionHeroFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {image, heading, subheading, link} = section;

  const backgroundImage = image?.image?.url
    ? `url("${image.image.url}")`
    : undefined;

  return (
    <section
      className="section-hero"
      style={{
        backgroundImage,
        height: '50%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        position: 'relative',
        minHeight: '500px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '2rem',
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {heading && <h1 style={{marginBottom: 0}}>{heading.parsedValue}</h1>}
        {subheading && <p>{subheading.value}</p>}
        {link?.href?.value && (
          <Link
            to={link.href.value}
            style={{
              textDecoration: 'underline',
              marginTop: '1rem',
            }}
            target={link?.target?.value === 'false' ? '_self' : '_blank'}
          >
            {link?.text?.value}
          </Link>
        )}
      </div>
    </section>
  );
}

const MEDIA_IMAGE_FRAGMENT = `#graphql
  fragment MediaImage on MediaImage {
    image {
      altText
      url
      width
      height
    }
  }
`;

const LINK_FRAGMENT = `#graphql
  fragment Link on MetaobjectField {
    ... on MetaobjectField {
      reference {
        ...on Metaobject {
          href: field(key: "href") {
            value
          }
          target: field(key: "target") {
            value
          }
          text: field(key: "text") {
            value
          }
        }
      }
    }
  }
`;

export const SECTION_HERO_FRAGMENT = `#graphql
  fragment SectionHero on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    subheading: field(key: "subheading") {
      key
      value
    }
    link: field(key: "link") {
      ...Link
    }
    image: field(key: "image") {
      key
      reference {
        ... on MediaImage {
          ...MediaImage
        }
      }
    }
  }
  ${LINK_FRAGMENT}
  ${MEDIA_IMAGE_FRAGMENT}
`;
