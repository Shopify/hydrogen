'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const data = {
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
  description: 'Provides access to the cart object.',
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
      description:
        '`useCart` hook must be a descendent of a `CartProvider` component.',
    },
  ],
};
exports.default = data;
