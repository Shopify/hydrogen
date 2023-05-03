import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CacheNone',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `The CacheNone() strategy instructs caches not to store any data. The function accepts no arguments.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CacheNone.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './CacheNone.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CacheNoneGeneratedType',
      description: '',
    },
  ],
};

export default data;
