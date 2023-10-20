import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'OptimisticInput',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a form input for optimistic UI updates. Use `useOptimisticData` to update the UI with the latest optimistic data.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './OptimisticInput.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './OptimisticInput.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'OptimisticInputProps',
      description: '',
    },
  ],
};

export default data;
