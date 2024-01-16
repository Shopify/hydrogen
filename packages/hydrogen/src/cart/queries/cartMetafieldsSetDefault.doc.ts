import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartMetafieldsSetDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/current/input-objects/CartMetafieldsSetInput) without `ownerId` and set the metafields to a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartMetafieldsSetDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartMetafieldsSetDefault',
      type: 'CartMetafieldsSetDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
