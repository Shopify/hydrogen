import {Image} from '@shopify/hydrogen';
import type {SectionImageTextQuery} from 'storefrontapi.generated';

export function ImageText(section: SectionImageTextQuery['section']) {
  const {heading, image} = section ?? {};
  if (!heading || !image) return null;

  return (
    <section className="section_image_text">
      <h1>{heading.value}</h1>
      {image.reference?.image ? (
        <Image sizes="100vw" data={image.reference.image} />
      ) : null}
    </section>
  );
}

/*
 * The generated query for this section looks like:
 * --------------------------------------------------------------------------------------

query SectionImageText($handle: String!) {
  section: metaobject(handle: {handle: $handle, type: "section_image_text"}) {
    id
    handle
    type
    heading: field(key: "heading") {
      value
    }
    image: field(key: "image") {
      reference {
        ...MediaImageFragment
      }
    }
  }
}

fragment MediaImageFragment on MediaImage {
  __typename
  image {
    altText
    url
    width
    height
  }
}
*/

/*
 * The query response would look like
 --------------------------------------------------------------------------------------
*
{
  "id": "gid://shopify/Metaobject/602701880",
  "handle": "section-image-text-default",
  "type": "section_image_text",
  "heading": {
    "value": "Image Text Heading"
  },
  "image": {
    "reference": {
      "__typename": "MediaImage",
      "image": {
        "altText": null,
        "url": "https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Main-the-Inferno_23782978-cfe9-42ca-b5ef-9f04284b1872.jpg?v=1684520797",
        "width": 3908,
        "height": 3908
      }
    }
  }
}
*/
