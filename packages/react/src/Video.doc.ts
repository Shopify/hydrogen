import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Video',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'MediaFile',
      type: 'component',
      url: '/api/react-storefront-kit/hooks/mediafile',
    },
    {
      name: 'Image',
      type: 'component',
      url: '/api/react-storefront-kit/hooks/image',
    },
  ],
  description:
    "The `Video` component renders a video for the Storefront API's [Video object](https://shopify.dev/api/storefront/reference/products/video).\nThe component outputs a `video` element. You can [customize this component](https://shopify.dev/api/hydrogen/components#customizing-hydrogen-components) using passthrough props.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './Video.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './Video.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'VideoProps',
      description: '',
    },
  ],
};

export default data;
