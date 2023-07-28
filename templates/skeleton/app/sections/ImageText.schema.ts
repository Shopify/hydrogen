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
      type: 'file_reference',
      description: 'The image to display in the section',
      required: true,
      default: {
        altText: null,
        url: 'https://placehold.co/1920x1080.jpg',
        width: 1920,
        height: 1000,
      },
    },
  ],
});
