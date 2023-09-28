import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useOptimisticData',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'Gets the latest optimistic data with matching optimistic id from actions. Use `OptimisticInput` to accept optimistic data in forms.',
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
      type: 'UseOptimisticDataGeneratedType',
      description: '',
    },
  ],
};

export default data;
