import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'useLoadScript',
  category: 'hooks',
  isVisualComponent: false,
  related: [],
  description:
    'The `useLoadScript` hook loads an external script tag in the browser. It allows React components to lazy-load third-party dependencies.',
  type: 'hook',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './load-script.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './load-script.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'LoadScriptParams',
      description: '',
    },
  ],
};

export default data;
