import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'storefrontRedirect',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `Queries the Storefront API to see if there is any redirect [created for the current route](https://help.shopify.com/en/manual/online-store/menus-and-links/url-redirect) and performs it. Otherwise, it returns the response passed in the parameters. Useful for conditionally redirecting after a 404 response.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './storefrontRedirect.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './storefrontRedirect.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'StorefrontRedirectGeneratedType',
      description: '',
    },
  ],
};

export default data;
