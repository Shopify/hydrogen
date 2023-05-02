import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'parseGid',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `
    Parses global id (gid) and returns the resource type and id.
  `,
  type: 'gear',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './parse-gid.example.jsx',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ParseGidGeneratedType',
      description: '',
    },
  ],
};

export default data;
