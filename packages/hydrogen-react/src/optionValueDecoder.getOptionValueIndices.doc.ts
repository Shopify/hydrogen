import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getOptionValueIndices',
  category: 'utilities',
  subCategory: 'Product option value decoder',
  isVisualComponent: false,
  related: [
    {
      name: 'decodeOptionValues',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/decodeOptionValues',
    },
    {
      name: 'isOptionValueInEncoding',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/isOptionValueInEncoding',
    },
  ],
  description:
    'Returns the indices of the option values for the product option set.',
  type: 'utility',
  defaultExample: {
    description: 'Get option value indices',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './optionValueDecoder.getOptionValueIndices.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './optionValueDecoder.getOptionValueIndices.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'GetOptionValueIndicesGeneratedType',
      description:
        'Returns the indices of the option values for the product option set.',
    },
  ],
};

export default data;
