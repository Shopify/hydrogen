const data = {
  name: 'cartMetafieldsSetDefault',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartMetafieldsSetInput](https://shopify.dev/docs/api/storefront/2024-07/input-objects/CartMetafieldsSetInput) without `ownerId` and set the metafields to a cart',
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
