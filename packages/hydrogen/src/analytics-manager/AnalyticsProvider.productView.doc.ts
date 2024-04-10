import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'UNSTABLE_Analytics.ProductView',
  category: 'components',
  subCategory: 'analytics',
  isVisualComponent: false,
  related: [],
  description:
    'Publishes a `product_viewed` event to the `UNSTABLE_Analytics.Provider` component.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AnalyticsProvider.productView.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './AnalyticsProvider.productView.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AnalyticsProductViewGeneratedType',
      description: '',
    },
  ],
};

export default data;
