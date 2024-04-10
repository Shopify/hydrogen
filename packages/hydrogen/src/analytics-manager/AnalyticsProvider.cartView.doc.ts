import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'UNSTABLE_Analytics.CartView',
  category: 'components',
  subCategory: 'analytics',
  isVisualComponent: false,
  related: [],
  description:
    'Publishes a `cart_viewed` event to the `UNSTABLE_Analytics.Provider` component.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AnalyticsProvider.cartView.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './AnalyticsProvider.cartView.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AnalyticsCartViewGeneratedType',
      description: '',
    },
  ],
};

export default data;
