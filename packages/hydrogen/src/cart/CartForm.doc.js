const data = {
  name: 'CartForm',
  category: 'components',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a form for managing cart operations. Use `CartActionInput` to accept form inputs of known type.',
  type: 'component',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './CartForm.example.jsx',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './CartForm.example.tsx',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CartFormProps',
      description: '',
    },
  ],
  examples: {
    description: 'Examples of various ways to use the `CartForm` component.',
    exampleGroups: [
      {
        title: 'CartForm using HTML input tags as form inputs',
        examples: [
          {
            description:
              'Use HTML input tags with CartForm to accept form inputs.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './CartForm.input-tag.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './CartForm.input-tag.example.tsx',
                  language: 'tsx',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Custom actions',
        examples: [
          {
            description:
              'Create custom actions to accept form inputs of unknown type. Just prepend `Custom` in front of your custom action name.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './CartForm.custom.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './CartForm.custom.example.tsx',
                  language: 'tsx',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'CartForm with fetcher',
        examples: [
          {
            description:
              'Use `CartForm` with a fetcher to manually submit the form. An example usage is to submit the form on changes to the state of a checkbox.\n\nWhen using fetcher to submit, make sure to have a `CartForm.INPUT_NAME` data key and its data should be a JSON stringify object.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './CartForm.fetcher.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './CartForm.fetcher.example.tsx',
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
