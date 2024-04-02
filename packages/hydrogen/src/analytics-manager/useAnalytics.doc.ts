import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useUnstable__Analytics',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'A hook that provides access to the analytics provider context. Must be a descendent of [`Unstable__Analytics.Provider`](/docs/api/hydrogen/2024-01/components/unstable__analytics-provider).',
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
    description: 'Example usage with `useUnstable__Analytics`:',
    exampleGroups: [
      {
        title: 'useUnstable__Analytics.register',
        examples: [
          {
            description:
              'Registers an unique key for the analytics provider to wait for ready callback before sending any events.',
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
