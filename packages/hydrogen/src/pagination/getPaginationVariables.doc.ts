import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getPaginationVariables',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'Pagination',
      type: 'components',
      url: '/docs/api/hydrogen/2024-07/components/pagination',
    },
  ],
  description: `The \`getPaginationVariables\` function is used with the [\`<Pagination>\`](/docs/api/hydrogen/components/pagnination) component to generate the variables needed to fetch paginated data from the Storefront API. The returned variables should be used within your storefront GraphQL query.`,
  type: 'utility',
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
      type: 'GetPaginationVariablesGeneratedType',
      description: '',
    },
  ],
};

export default data;
