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
      name: 'Storefront API Types',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefrontapitypes',
    },
  ],
  description: `
    Hydrogen React ships with a pre-generated GraphQL schema for the Storefront API, which can integrate with your IDE and other GraphQL tooling (such as a [GraphQL config file](https://www.graphql-config.com/docs/user/user-usage)) to provide autocompletion and validation for your Storefront API GraphQL queries.

    This schema is generated using the Storefront API's introspection query, and is available at \`@shopify/hydrogen-react/storefront.schema.json\`.

    To get these features working in your IDE, you may need to install an extension. For example, in VSCode you can install this [GraphQL extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql).
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'GraphQL Config File',
          code: './graphqlrc.example.yml',
          language: 'yml',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
