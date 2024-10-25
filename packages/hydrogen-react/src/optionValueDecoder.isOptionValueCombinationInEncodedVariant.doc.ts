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
  description: `
    Determines whether an option value combination is present in an encoded option value string.\n\n\`targetOptionValueCombination\` - Indices of option values to look up in the encoded option value string. A partial set of indices may be passed to determine whether a node or any children is present. For example, if a product has 3 options, passing \`[0]\` will return true if any option value combination for the first option's option value is present in the encoded string.
  `,
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
      type: 'IsOptionValueCombinationInEncodedVariant',
      description: '',
    },
  ],
};

export default data;
