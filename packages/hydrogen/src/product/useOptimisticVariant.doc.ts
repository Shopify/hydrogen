import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useOptimisticVariant',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'VariantSelector',
      type: 'components',
      url: '/docs/api/hydrogen/2025-01/components/variantselector',
    },
    {
      name: 'useOptimisticCart',
      type: 'hooks',
      url: '/docs/api/hydrogen/2025-01/hooks/useoptimisticcart',
    },
  ],
  description: `The \`useOptimisticVariant\` takes an existing product variant, processes a pending navigation to another product variant, and returns the data of the destination variant. This makes switching product options immediate.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useOptimisticVariant.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useOptimisticVariant.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseOptimisticVariantGeneratedType',
      description: '',
    },
  ],
};

export default data;
