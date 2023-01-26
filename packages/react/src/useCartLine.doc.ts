import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useCartLine',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'CartLineProvider',
      type: 'component',
      url: '/api/react-storefront-kit/components/CartLineProvider',
    },
  ],
  description: `
    The \`useCartLine\` hook provides access to the cart line object. It must be a descendent of a \`CartProvider\` component.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartLineProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './CartLineProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
