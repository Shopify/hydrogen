import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CacheShort',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createstorefrontclient',
    },
    {
      name: 'CacheNone',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/cachenone',
    },
    {
      name: 'CacheLong',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/cachelong',
    },
    {
      name: 'CacheCustom',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/cachecustom',
    },
  ],
  description: `The \`CacheShort\` strategy instructs caches to store data for 1 second, and \`staleWhileRevalidate\` data for an additional 9 seconds. Note: these time values are subject to change.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CacheShort.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './CacheShort.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CacheShortGeneratedType',
      description: '',
    },
  ],
};

export default data;
