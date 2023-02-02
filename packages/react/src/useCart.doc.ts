import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useCart',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'CartProvider',
      type: 'components',
      url: '/api/hydrogen-react/components/CartProvider',
    },
  ],
  description: `
    The \`useCart\` hook provides access to the cart object. It must be a descendent of a \`CartProvider\` component.
  `,
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseCartGeneratedType',
      description: '',
    },
  ],
};

export default data;
