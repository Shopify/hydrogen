import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'storefrontApiCustomScalars',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'storefront.schema.json',
      type: 'gear',
      url: '/api/react-storefront-kit/utilities/storefront.schema.json',
    },
    {
      name: 'Storefront API Types',
      type: 'gear',
      url: '/api/react-storefront-kit/utilities/storefrontapitypes',
    },
  ],
  description: `
    Meant to be used with GraphQL CodeGen to type the Storefront API's custom scalars correctly when using TypeScript.By default, GraphQL CodeGen uses \`any\` for custom scalars; by using these definitions, GraphQL Codegen will generate the correct types for the Storefront API's custom scalars.\n\nSee more about [GraphQL CodeGen](https://graphql-code-generator.com/) and [custom scalars for TypeScript](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#scalars).\n\nNote that \`@shopify/hydrogen-react\` has already generated types for the Storefront API, so you may not need to setup GraphQL Codegen on your own.
  `,
  type: 'gear',
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
      title: 'codegen.ts',
    },
  },
  definitions: [],
};

export default data;
