import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CacheLong',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-07/utilities/createstorefrontclient',
    },
    {
      name: 'CacheNone',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-07/utilities/cachenone',
    },
    {
      name: 'CacheShort',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-07/utilities/cacheshort',
    },
    {
      name: 'CacheCustom',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-07/utilities/cachecustom',
    },
  ],
  description: `The \`CacheLong\` strategy instructs caches to store data for 1 hour, and \`staleWhileRevalidate\` data for an additional 23 hours. Note: these time values are subject to change.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CacheLong.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './CacheLong.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CacheLongGeneratedType',
      description: '',
    },
  ],
};

export default data;
