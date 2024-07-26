import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createWithCache',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [],
  description: `Creates a utility function that executes an asynchronous operation \n like \`fetch\` and caches the result according to the strategy provided.\nUse this to call any third-party APIs from loaders or actions.\n > Note:\n > Sometimes a request to a third-party API might fail, and the result should *not* be cached.\n > Prevent caching by throwing when a request fails. If you don't throw, the result will be cached.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './create-with-cache.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './create-with-cache.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CreateWithCacheGeneratedType',
      description: '',
    },
  ],
};

export default data;
