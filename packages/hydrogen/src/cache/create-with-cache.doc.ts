import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createWithCache',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [],
  description:
    'Creates utility functions to store data in cache with stale-while-revalidate support.\n - Use `withCache.fetch` to simply fetch data from a third-party API.\n - Use the more advanced `withCache.run` to execute any asynchronous operation.',
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
