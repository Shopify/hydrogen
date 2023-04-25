import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createWithCache',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `Creates a utility function that executes an asynchronous operation \n like \`fetch\` and caches the result according to the strategy provided.\nUse this to call any third-party APIs from loaders or actions.\nBy default, it uses the \`CacheShort\` strategy.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './with-cache.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './with-cache.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'WithCache',
      description: '',
    },
  ],
};

export default data;
