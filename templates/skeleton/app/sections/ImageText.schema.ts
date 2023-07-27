import {defineSection} from '@shopify/hydrogen';

export default defineSection({
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

export const IMAGE_TEXT_QUERY = `#graphql
    query SectionImageText($handle: String!) {
      section: metaobject(
        handle: {
          handle: $handle,
          # We preprend section_ to the metaobjectDefintion.type
          # and block_ to block metaobjectDefinition.type during creation
          type: "section_image_text"
        }
      ) {
        id
        handle
        type
        heading: field(key: "heading") { value }
image: field(key: "image") { reference { ...MediaImageFragment } }
        
      }
    }
    #graphql
  fragment MediaImageFragment on MediaImage {
    __typename
    image {
      altText
      url
      width
      height
    }
  }

  `;
