import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'unstable_useAnalytics',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'A hook that provides access to the analytics provider context. Must be a descendent of [`UNSTABLE_Analytics.Provider`](/docs/api/hydrogen/2024-04/components/unstable_analytics-provider).',
  type: 'hook',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useAnalytics.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './useAnalytics.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Returns',
      type: 'AnalyticsContextValueForDoc',
      description: '',
    },
  ],
  examples: {
    description: 'Example usage with `unstable_useAnalytics`:',
    exampleGroups: [
      {
        title: 'unstable_useAnalytics.register',
        examples: [
          {
            description:
              'Registers a unique key with the analytics provider component, enabling custom analytics integrations to wait for a callback before sending event data.',
            codeblock: {
              title: '',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './useAnalytics.register.example.tsx',
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
