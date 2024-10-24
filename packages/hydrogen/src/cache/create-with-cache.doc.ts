import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createWithCache',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [],
  description: `Creates utility functions to store data in cache with stale-while-revalidate support.
 - Use \`withCache.fetch\` to simply fetch data from a third-party API.
   Fetches data from a URL and caches the result according to the strategy provided.
   When the response is not successful (e.g. status code >= 400), the caching is
   skipped automatically and the returned \`data\` is \`null\`.
   You can also prevent caching by using the \`shouldCacheResponse\` option and returning
   \`false\` from the function you pass in. For example, you might want to fetch data from a
   third-party GraphQL API but not cache the result if the GraphQL response body contains errors.
 - Use the more advanced \`withCache.run\` to execute any asynchronous operation.
   Utility function that executes asynchronous operations and caches the
   result according to the strategy provided. Use this to do any type
   of asynchronous operation where \`withCache.fetch\` is insufficient.
   For example, when making multiple calls to a third-party API where the
   result of all of them needs to be cached under the same cache key.
   Whatever data is returned from the \`fn\` will be cached according
   to the strategy provided.
   > Note:
   > To prevent caching the result you must throw an error. Otherwise, the result will be cached.
   > For example, if you call \`fetch\` but the response is not successful (e.g. status code >= 400),
   > you should throw an error. Otherwise, the response will be cached.
`,
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
