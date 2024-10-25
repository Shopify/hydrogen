import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'CacheCustom',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-10/utilities/createstorefrontclient',
    },
    {
      name: 'CacheNone',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-10/utilities/cachenone',
    },
    {
      name: 'CacheShort',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-10/utilities/cacheshort',
    },
    {
      name: 'CacheLong',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-10/utilities/cachelong',
    },
  ],
  description: `This allows you to create your own caching strategy, using any of the options available in a \`CachingStrategy\` object.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CacheCustom.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './CacheCustom.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CacheCustomGeneratedType',
      description: '',
    },
  ],
};

export default data;
