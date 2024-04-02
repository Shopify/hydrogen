import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'UNSTABLE_Analytics.Provider',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description:
    'Provides a context to track page view, cart events and send them to Shopify. It is integrated with the Customer Privacy API for consent management. It is flexible for other analytics platform to integrate into its subscribe and publish system. It provides the [`unstable_useAnalytics`](/docs/api/hydrogen/2024-01/hooks/unstable_useanalytics) hook to access the analytics provider context.',
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
  examples: {
    description: 'List of components available with `Analytics`:',
    exampleGroups: [
      {
        title: 'UNSTABLE_Analytics.CartView',
        examples: [
          {
            description:
              'Publishes a `cart_viewed` event to the `UNSTABLE_Analytics.Provider`.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './AnalyticsProvider.cartView.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'UNSTABLE_Analytics.CollectionView',
        examples: [
          {
            description:
              'Publishes a `collection_viewed` event to the `UNSTABLE_Analytics.Provider`.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './AnalyticsProvider.collectionView.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'UNSTABLE_Analytics.CustomView',
        examples: [
          {
            description:
              'Publishes a custom page view event to the `UNSTABLE_Analytics.Provider`. The `type` prop must be preceded by `custom_`.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './AnalyticsProvider.customView.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'UNSTABLE_Analytics.ProductView',
        examples: [
          {
            description:
              'Publishes a `product_viewed` event to the `UNSTABLE_Analytics.Provider`.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './AnalyticsProvider.productView.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'UNSTABLE_Analytics.SearchView',
        examples: [
          {
            description:
              'Publishes a `collection_viewed` event to the `UNSTABLE_Analytics.Provider`.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './AnalyticsProvider.searchView.example.jsx',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export default data;
