import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'RichText',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`RichText\` component renders a metafield of type \`rich_text_field\`.
  `,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './RichText.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './RichText.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'RichTextPropsForDocs',
      description: '',
    },
  ],
};

export default data;
