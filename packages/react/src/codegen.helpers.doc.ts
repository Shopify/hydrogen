import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'storefrontApiCustomScalars',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'storefront.schema.json',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefront.schema.json',
    },
    {
      name: 'Storefront API Types',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefrontapitypes',
    },
  ],
  description: `
    Meant to be used with GraphQL CodeGen to type the Storefront API's custom scalars correctly when using TypeScript.
    By default, GraphQL CodeGen uses \`any\` for custom scalars; by using these definitions, GraphQL Codegen will generate the correct types for the Storefront API's custom scalars.

    See more about [GraphQL CodeGen](https://graphql-code-generator.com/) and [custom scalars for TypeScript](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#scalars).

    Note that \`@shopify/hydrogen-react\` has already generated types for the Storefront API, so you may not need to setup GraphQL Codegen on your own.
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'Codegen Config',
          code: './codegen.helpers.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
