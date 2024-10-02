import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'isOptionValueCombinationInEncodedVariant',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'decodeEncodedVariant',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/decodeEncodedVariant',
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
          code: './optionValueDecoder.isOptionValueCombinationInEncodedVariant.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'IsOptionValueCombinationInEncodedVariantForDocs',
      description: '',
    },
  ],
};

export default data;
