import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'decodeOptionValues',
  category: 'utilities',
  subCategory: 'Product option value decoder',
  isVisualComponent: false,
  related: [
    {
      name: 'getOptionValueIndices',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/getOptionValueIndices',
    },
    {
      name: 'isOptionValueInEncoding',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/isOptionValueInEncoding',
    },
  ],
  description:
    'Decodes an encoded option value string into an array of option value combinations.',
  type: 'utility',
  defaultExample: {
    description: 'Decode an encoded option value string',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './optionValueDecoder.decodeOptionValues.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './optionValueDecoder.decodeOptionValues.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'DecodeOptionValuesGeneratedType',
      description:
        'Decodes an encoded option value string into an array of option value combinations.',
    },
  ],
};

export default data;
