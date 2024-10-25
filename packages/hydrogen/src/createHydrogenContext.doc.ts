import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createHydrogenContext',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createHydrogenContext',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-10/utilities/createhydrogencontext',
    },
  ],
  description: `
The \`createHydrogenContext\` function creates the context object required to use Hydrogen utilities throughout a Hydrogen project.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './createHydrogenContext.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './createHydrogenContext.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'createHydrogenContext(options)',
      type: 'HydrogenContextOptionsForDocs',
      description: '',
    },
    {
      title: 'Returns',
      type: 'HydrogenContext',
      description: '',
    },
  ],
};

export default data;
