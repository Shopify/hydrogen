import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Analytics.Provider',
  category: 'components',
  subCategory: 'analytics',
  isVisualComponent: false,
  related: [],
  description:
    'Provides a context for tracking page views and cart events to send as analytics data to Shopify. This component is integrated with the Customer Privacy API for consent management. The provider can also be used to connect third-party analytics services through its subscribe and publish system. The [`useAnalytics`](/docs/api/hydrogen/2025-01/hooks/useanalytics) hook provides access to the analytics provider context.\n\nYou can also listen to a `document` event for `shopifyCustomerPrivacyApiLoaded`. It will be emitted when the Customer Privacy API is loaded.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AnalyticsProvider.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './AnalyticsProvider.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AnalyticsProviderProps',
      description: '',
    },
  ],
};

export default data;
