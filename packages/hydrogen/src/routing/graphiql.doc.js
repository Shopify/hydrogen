const data = {
  name: 'graphiqlLoader',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `This function creates an instance of [GraphiQL](https://graphql.org/swapi-graphql) in your Hydrogen app when running on a development server. This enables you to explore, write, and test GraphQL queries using your store's live data from the Storefront API. You can visit the GraphiQL app at your storefront route /graphiql. Learn more about [using GraphiQL in Hydrogen](/docs/custom-storefronts/hydrogen/data-fetching/graphiql).`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './graphiql.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './graphiql.example.ts',
          language: 'ts',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Arguments',
      type: 'GraphiQLLoader',
      description: '',
    },
  ],
};
export default data;
