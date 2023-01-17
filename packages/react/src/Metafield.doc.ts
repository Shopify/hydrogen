import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Metafield',
  category: 'components',
  isVisualComponent: true,
  related: [
    {
      name: 'parseMetafield',
      type: 'utility',
      url: 'api/hydrogen/utilities/parsemetafield',
    },
    {
      name: 'parseMetafieldValue',
      type: 'utility',
      url: 'api/hydrogen/utilities/parsemetafieldvalue',
    },
  ],
  description:
    "The `Metafield` component renders the value of a Storefront API's\n[Metafield object](https://shopify.dev/api/storefront/reference/common-objects/metafield). Relies on the `locale` property of the `useShop()` hook, so it must be a descendent of `<ShopifyProvider/>`.\nRenders a smart default of the Metafield's `value`. For more information, refer to the [Default output](#default-output) section.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Metafield.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Metafield.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'MetafieldProps',
      description: '',
    },
  ],
};

export default data;
