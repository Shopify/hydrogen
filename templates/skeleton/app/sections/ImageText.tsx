import {defineSection, Image} from '@shopify/hydrogen';
import type {MediaImage} from '@shopify/hydrogen/storefront-api-types';

// TODO: these types should be auto code-generated from the CLI based
// on the passed schema and the generated query.
type SectionImageText = {
  name: 'Image Text';
  type: 'section_image_text';
  heading: {
    value: string;
  };
  image: {
    reference?: MediaImage;
  };
};

export function ImageText({heading, image}: SectionImageText) {
  return (
    <section className="section_image_text">
      <h1>{heading.value}</h1>
      {image.reference?.image ? (
        <Image sizes="100vw" data={image.reference.image} />
      ) : null}
    </section>
  );
}

ImageText.section = defineSection({
  name: 'Image Text',
  type: 'image_text',
  fields: [
    {
      name: 'Text',
      key: 'heading',
      type: 'single_line_text_field',
      default: 'Image Text Heading',
      required: true,
    },
    {
      name: 'Image',
      key: 'image',
      type: 'file_reference',
      required: true,
      default: {
        altText: null,
        url: 'https://placehold.co/1920x1080.jpg',
        width: 1920,
        height: 1080,
      },
    },
  ],
});

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
