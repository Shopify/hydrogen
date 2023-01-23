import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ProductPrice',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'ProductProvider',
      type: 'component',
      url: '/api/react-storefront-kit/components/productprovider',
    },
    {
      name: 'Money',
      type: 'component',
      url: '/api/react-storefront-kit/components/money',
    },
  ],
  description:
    "The `ProductPrice` component renders a `Money` component with the product [`priceRange`](https://shopify.dev/api/storefront/reference/products/productpricerange)'s `maxVariantPrice` or `minVariantPrice`, for either the regular price or compare at price range.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ProductPrice.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ProductPrice.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ProductPriceProps',
      description: '',
    },
  ],
};

export default data;
