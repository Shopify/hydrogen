import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Pagination',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'getPaginationVariables',
      type: 'utilities',
      url: '/docs/api/hydrogen/2025-04/utilities/getpaginationvariables',
    },
  ],
  description: `The [Storefront API uses cursors](https://shopify.dev/docs/api/usage/pagination-graphql) to paginate through lists of data and the \`<Pagination />\` component makes it easy to paginate data from the Storefront API. It is important for pagination state to be maintained in the URL, so that the user can navigate to a product and return back to the same scrolled position in a list. It is also important that the list state is shareable via URL. The \`<Pagination>\` component provides a render prop with properties to load more elements into your list.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Pagination.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Pagination.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'PaginationProps',
      description: '',
    },
  ],
  examples: {
    description: 'Other examples using the `Pagination` component.',
    exampleGroups: [
      {
        title: 'Multiple `Pagination` components on a single page',
        examples: [
          {
            description:
              'Use the `namespace` prop to differentiate between multiple `Pagination` components on a single page',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './Pagination.multiple.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './Pagination.multiple.example.tsx',
                  language: 'tsx',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export default data;
