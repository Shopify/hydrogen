import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ShopifyProvider',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useShop',
      type: 'hook',
      url: '/api/react-storefront-kit/hooks/useshop',
    },
  ],
  description:
    "The `ShopifyProvider` component wraps your entire app and provides functionality for many components, hooks, and utilities. The `ShopifyProvider` component also provides localization data for the app. You should place it in your app's entry point component.",
  type: 'component',
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
      type: 'ShopifyProviderProps',
      description: '',
    },
  ],
};

export default data;
