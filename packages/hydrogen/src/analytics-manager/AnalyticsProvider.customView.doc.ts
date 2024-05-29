import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Analytics.CustomView',
  category: 'components',
  subCategory: 'analytics',
  isVisualComponent: false,
  related: [],
  description:
    'Publishes a custom page view event to the `Analytics.Provider` component. The `type` prop must be preceded by `custom_`.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './AnalyticsProvider.customView.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './AnalyticsProvider.customView.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'AnalyticsCustomViewGeneratedType',
      description: '',
    },
  ],
};

export default data;
