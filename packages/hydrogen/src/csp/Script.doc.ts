import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Script',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `Use the \`Script\` component to add third-party scripts to your app. It automatically adds a nonce attribute from your Content Security Policy.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Script.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Script.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ScriptProps',
      description: '',
    },
  ],
};

export default data;
