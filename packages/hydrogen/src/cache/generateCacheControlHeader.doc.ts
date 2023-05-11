import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'generateCacheControlHeader',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `This utility function accepts a \`CachingStrategy\` object and returns a string with the corresponding \`cache-control\` header.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './generateCacheControlHeader.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './generateCacheControlHeader.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'GenerateCacheControlHeaderGeneratedType',
      description: '',
    },
  ],
};

export default data;
