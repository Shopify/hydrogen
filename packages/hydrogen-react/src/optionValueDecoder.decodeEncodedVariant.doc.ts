import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'decodeEncodedVariant',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'isOptionValueCombinationInEncodedVariant',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/isOptionValueCombinationInEncodedVariant',
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
          code: './optionValueDecoder.decodeEncodedVariant.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'DecodeEncodedVariantGeneratedType',
      description:
        'Decodes an encoded option value string into an array of option value combinations.',
    },
  ],
};

export default data;
