import {defineSection} from '@shopify/hydrogen';

export default defineSection({
  name: 'Image Text',
  type: 'image_text',
  displayNameKey: null,
  description: null,
  fields: [
    {
      name: 'Heading',
      key: 'heading',
      type: 'single_line_text_field',
      default: 'Image Text Heading',
      description: 'The main heading of the section',
      required: true,
    },
    {
      name: 'Image',
      key: 'image',
      type: 'url',
      description: 'The image to display in the section',
      required: true,
      default: 'https://placehold.co/1920x1080.jpg',
    },
  ],
});

export const IMAGE_TEXT_FRAGMENTS = `#graphql
  fragment ImageText on Metaobject {
    id
    handle
    type
    heading: field(key: "heading") { value type }
image: field(key: "image") { value type }
    
  }
  
` as const;

export const IMAGE_TEXT_QUERY = `#graphql
  query SectionImageText($handle: String!) {
    section: metaobject(handle: { handle: $handle, type: "section_image_text" }) {
      ...ImageText
    }
  }
  ${IMAGE_TEXT_FRAGMENTS}
` as const;
