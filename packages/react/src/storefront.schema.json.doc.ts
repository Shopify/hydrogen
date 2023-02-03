import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Storefront Schema',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'storefrontApiCustomScalars',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/storefrontApiCustomScalars',
    },
    {
      name: 'Storefront API Types',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/storefrontapitypes',
    },
  ],
  description: `
    Hydrogen React ships with a pre-generated GraphQL schema for the Storefront API, which can integrate with your IDE and other GraphQL tooling (such as a [GraphQL config file](https://www.graphql-config.com/docs/user/user-usage)) to provide autocompletion and validation for your Storefront API GraphQL queries.\n\nThis schema is generated using the Storefront API's introspection query, and is available at \`@shopify/hydrogen-react/storefront.schema.json\`.\n\nTo get these features working in your IDE, you may need to install an extension. For example, in VSCode you can install this [GraphQL extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql).
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
      title: '.graphqlrc.yml',
    },
  },
  definitions: [],
};

export default data;
