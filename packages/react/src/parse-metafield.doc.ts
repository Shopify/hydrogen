import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'parseMetafield',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `
    A function that uses \`metafield.type\` to parse the Metafield's \`value\` or \`reference\` or \`references\` (depending on the \`metafield.type\`) and places the result in \`metafield.parsedValue\`
  
    TypeScript developers can use the type \`ParsedMetafields\` from this package to get the returned object's type correct.
  `,
  type: 'utility',
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
      description: '',
    },
  ],
};

export default data;
