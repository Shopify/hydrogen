import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'isOptionValueInEncoding',
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
      name: 'getOptionValueIndices',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/getOptionValueIndices',
    },
  ],
  description:
    'Determines whether an option value set is present in an encoded option value string.',
  type: 'utility',
  defaultExample: {
    description: 'Check if option value is in encoding',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './optionValueDecoder.isOptionValueInEncoding.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './optionValueDecoder.isOptionValueInEncoding.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'IsOptionValueInEncodingGeneratedType',
      description:
        'Determines whether an option value set is present in an encoded option value string.',
    },
  ],
};

export default data;
