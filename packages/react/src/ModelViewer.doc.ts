import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'ModelViewer',
  category: 'components',
  isVisualComponent: true,
  related: [
    {
      name: 'MediaFile',
      type: 'component',
      url: 'api/hydrogen/components/primitive/mediafile',
    },
  ],
  description:
    "The `ModelViewer` component renders a 3D model (with the `model-viewer` custom element) for the Storefront API's [Model3d object](https://shopify.dev/api/storefront/reference/products/model3d). The `model-viewer` custom element is lazily downloaded through a dynamically-injected `<script type='module'>` tag when the `<ModelViewer />` component is rendered. ModelViewer is using version `1.21.1` of the `@google/model-viewer` library.",
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './ModelViewer.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './ModelViewer.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'ModelViewerProps',
      description: '',
    },
  ],
};

export default data;
