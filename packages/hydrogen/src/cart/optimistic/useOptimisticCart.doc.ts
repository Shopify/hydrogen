import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useOptimisticCart',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'CartForm',
      type: 'components',
      url: '/docs/api/hydrogen/2024-07/components/cartform',
    },
  ],
  description: `The \`useOptimisticCart\` takes an existing cart object, processes all pending cart actions, and locally mutates the cart with optimistic state. An optimistic cart makes cart actions immediately render in the browser while actions sync to the server. This increases the perceived performance of the application.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './useOptimisticCart.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './useOptimisticCart.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseOptimisticCartGeneratedType',
      description: '',
    },
  ],
};

export default data;
