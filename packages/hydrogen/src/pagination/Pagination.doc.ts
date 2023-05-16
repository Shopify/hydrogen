import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Pagnination',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description: `The \`<Pagination />\` component makes it easy to pagination lists using cursors from the Storefront API. It is important for paginatino state to be maintained in the URL, so that the user can navigate to a product and return back to the same scrolled position in a list. It is also important that the list state is shareable via URL. The \`<Pagination>\` componenent provides a render prop with properties to load more elements into your list.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Pagination.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './Pagination.example.tsx',
          language: 'ts',
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
};

export default data;
