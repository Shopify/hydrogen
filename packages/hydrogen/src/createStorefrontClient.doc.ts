import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createStorefrontClient',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `This function extends \`createStorefrontClient\` from [Hydrogen React](https://shopify.dev/docs/api/hydrogen-react/latest/utilities/createstorefrontclient). The additional arguments enable internationalization (i18n), caching, and other features particular to Remix and Oxygen.

Learn more about [data fetching in Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/fetch-data).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './storefrontClient.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './storefrontClient.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'CreateStorefrontClientGeneratedType',
      description: '',
    },
  ],
};

export default data;
