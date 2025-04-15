import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ShopifyI18nProvider',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useShop',
      type: 'hook',
      url: '/api/hydrogen-react/hooks/useshop',
    },
  ],
  description:
    "The `ShopifyI18nProvider` component wraps your entire Hydrogen app and provides localization data for the app. You should place it in your app's entry point component.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ShopifyI18nProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ShopifyI18nProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ShopifyI18nProviderProps',
      description: '',
    },
  ],
};

export default data;
