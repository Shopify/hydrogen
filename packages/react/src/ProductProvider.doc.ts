import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ProductProvider',
  category: 'components',
  isVisualComponent: true,
  related: [
    {
      name: 'useProductOptions',
      type: 'hook',
      url: 'api/hydrogen/hooks/product-variant/useproductoptions',
    },
    {
      name: 'ProductPrice',
      type: 'component',
      url: 'api/hydrogen/components/product-variant/productprice',
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
