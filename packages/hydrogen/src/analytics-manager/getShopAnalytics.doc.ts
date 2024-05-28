import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getShopAnalytics',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'A function that queries for shop required analytics data to be used in the [`Analytics.Provider`](/docs/api/hydrogen/2024-04/components/Analytics-provider) component.',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getShopAnalytics.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './getShopAnalytics.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'GetShopAnalyticsGeneratedType',
      description: '',
    },
  ],
};

export default data;
