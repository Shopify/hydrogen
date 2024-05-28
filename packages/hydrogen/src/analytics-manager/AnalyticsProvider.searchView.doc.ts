import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Analytics.SearchView',
  category: 'components',
  subCategory: 'analytics',
  isVisualComponent: false,
  related: [],
  description:
    'Publishes a `search_viewed` event to the `Analytics.Provider` component.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AnalyticsProvider.searchView.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './AnalyticsProvider.searchView.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AnalyticsSearchViewGeneratedType',
      description: '',
    },
  ],
};

export default data;
