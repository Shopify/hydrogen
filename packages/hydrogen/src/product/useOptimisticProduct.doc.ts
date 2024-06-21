import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useOptimisticProduct',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'VariantSelector',
      type: 'components',
      url: '/docs/api/hydrogen/2024-04/components/variantselector',
    },
    {
      name: 'useOptimisticCart',
      type: 'hooks',
      url: '/docs/api/hydrogen/2024-04/hooks/useoptimisticcart',
    },
  ],
  description: `The \`useOptimisticProduct\` takes an existing product object, processes a pending navigation to a product variant, and locally mutates the product with optimistic state. This makes switching product options immediate. It requires that the product query include a \`selectedVariant\` field populated by \`variantBySelectedOptions\`.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useOptimisticProduct.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useOptimisticProduct.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseOptimisticProductGeneratedType',
      description: '',
    },
  ],
};

export default data;
