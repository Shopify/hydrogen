import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useProduct',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'ShopifyProvider',
      type: 'component',
      url: '/api/hydrogen-react/components/shopifyprovider',
    },
  ],
  description:
    'Provides access to the product value passed to `<ProductProvider />`. It also includes properties for selecting product variants, options, and selling plans.',
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ShopifyProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ShopifyProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseProductGeneratedType',
      description:
        '`useProduct` must be a descendent of the `<ProductProvider />` component.',
    },
  ],
};

export default data;
