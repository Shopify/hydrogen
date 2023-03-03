import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'MediaFile',
  category: 'components',
  isVisualComponent: false,
  related: [
    {
      name: 'Image',
      type: 'component',
      url: '/api/hydrogen-react/components/image',
    },
    {
      name: 'Video',
      type: 'component',
      url: '/api/hydrogen-react/components/video',
    },
    {
      name: 'ExternalVideo',
      type: 'component',
      url: '/api/hydrogen-react/components/externalvideo',
    },
    {
      name: 'ModelViewer',
      type: 'component',
      url: '/api/hydrogen-react/components/modelviewer',
    },
  ],
  description:
    "The `MediaFile` component renders the media for the Storefront API's\n[Media object](https://shopify.dev/api/storefront/reference/products/media). It renders an `Image`, `Video`, an `ExternalVideo`, or a `ModelViewer` depending on the `__typename` of the `data` prop.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './MediaFile.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './MediaFile.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'MediaFileProps',
      description:
        'MediaFile renders an `Image`, `Video`, `ExternalVideo`, or `ModelViewer` component. Use the `mediaOptions` prop to customize the props sent to each of these components.',
    },
  ],
};

export default data;
