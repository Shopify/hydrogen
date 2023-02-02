import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useShop',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'ShopifyProvider',
      type: 'components',
      url: '/api/react-storefront-kit/components/ShopifyProvider',
    },
  ],
  description: `
    Provides access to the \`shopifyConfig\` prop of \`<ShopifyProvider/>\`. Must be a descendent of \`<ShopifyProvider/>\`.
  `,
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
      type: 'UseShopGeneratedType',
      description: '',
    },
  ],
};

export default data;
