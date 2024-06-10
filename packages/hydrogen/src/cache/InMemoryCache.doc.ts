import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'InMemoryCache',
  category: 'utilities',
  subCategory: 'caching',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utilities',
      url: '/docs/api/hydrogen/2024-01/utilities/createstorefrontclient',
    },
  ],

  description: `> Caution:
> This utility should only be used when deploying Hydrogen to a Node.js environment. It should *not* be used when deploying Hydrogen to Oxygen.

If you are deploying Hydrogen to a Node.js environment, you can use this limited implementation of an in-memory cache. It only supports the \`cache-control\` header. It does NOT support \`age\` or \`expires\` headers.

Learn more about [data fetching in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './InMemoryCache.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
