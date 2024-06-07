import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createWithCache',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [],
  description: `Creates a utility function that executes an asynchronous operation \n like \`fetch\` and caches the result according to the strategy provided.\nUse this to call any third-party APIs from loaders or actions.\nBy default, it uses the \`CacheShort\` strategy.`,
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
