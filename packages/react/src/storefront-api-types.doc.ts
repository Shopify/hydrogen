import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'storefront.schema.json',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'storefrontApiCustomScalars',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefrontApiCustomScalars',
    },
    {
      name: 'storefront.schema.json',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefront.schema.json',
    },
  ],
  description: `
    If you are using TypeScript, Hydrogen React ships with pre-generated TypeScript types that match the Storefront API's GraphQL schema. These types can be used when you need to manually create an object that matches a Storefront API object's shape.

    These types also work really well with the new [\`satisfies\` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator) introduced in TypeScript 4.9, though you don't need to use \`satisfies\` to use these types.
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'Storefront API Types in TypeScript',
          code: './storefront-api-types.example.tsx',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
