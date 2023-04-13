'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const data = {
  name: 'useProduct',
  category: 'hooks',
  isVisualComponent: false,
  related: [
    {
      name: 'ProductProvider',
      type: 'component',
      url: '/api/hydrogen-react/components/productprovider',
    },
  ],
  description:
    'Provides access to the product value passed to `<ProductProvider />`. It also includes properties for selecting product variants, options, and selling plans.',
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ProductProvider.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ProductProvider.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'UseProductGeneratedType',
      description:
        '`useProduct` must be a descendent of the `<ProductProvider />` component.',
    },
  ],
};
exports.default = data;
