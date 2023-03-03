import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'parseMetafield',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `
    A function that uses \`metafield.type\` to parse the Metafield's \`value\` or \`reference\` or \`references\` (depending on the \`metafield.type\`) and places the result in \`metafield.parsedValue\`.
  `,
  type: 'gear',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './parse-metafield.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './parse-metafield.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ParseMetafieldGeneratedType',
      description:
        'Use the `ParsedMetafields` type as the returned type of `parseMetafield(metafield)`',
    },
  ],
};

export default data;
