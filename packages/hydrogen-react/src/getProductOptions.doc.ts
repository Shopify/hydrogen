import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getProductOptions',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'mapSelectedProductOptionToObject',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/mapselectedproductoptiontoobject',
    },
    {
      name: 'getAdjacentAndFirstAvailableVariants',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/getadjacentandfirstavailablevariants',
    },
  ],
  description: `Returns a product options array with its relevant information about the variant. This function supports combined listing products and products with 2000 variants limit.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getProductOptions.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './getProductOptions.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
