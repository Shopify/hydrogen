import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useUnstable__Analytics',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'A hook that provides access to the analytics provider context. Must be a descendent of `Unstable__Analytics.Provider`.',
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
      title: 'Props',
      type: 'AnalyticsContextValue',
      description: '',
    },
  ],
};

export default data;
