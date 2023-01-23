import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ProductProvider',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'useProduct',
      type: 'hook',
      url: '/api/react-storefront-kit/hooks/useproduct',
    },
    {
      name: 'ProductPrice',
      type: 'component',
      url: '/api/react-storefront-kit/components/productprice',
    },
  ],
  description:
    '`<ProductProvider />` is a context provider that enables use of the `useProduct()` hook. It helps manage selected options and variants for a product.',
  type: 'component',
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
      title: 'ProductProvider example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ProductProviderProps',
      description: '',
    },
  ],
};

export default data;
