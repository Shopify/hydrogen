import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'VariantSelector',
  category: 'components',
  isVisualComponent: true,
  related: [
    {
      name: 'getSelectedProductOptions',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-04/utilities/getselectedproductoptions',
    },
    {
      name: 'getFirstAvailableVariant',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-04/utilities/getfirstavailablevariant',
    },
  ],
  description: `The \`VariantSelector\` component helps you build a form for selecting available variants of a product. It is important for variant selection state to be maintained in the URL, so that the user can navigate to a product and return back to the same variant selection. It is also important that the variant selection state is shareable via URL. The \`VariantSelector\` component provides a render prop that renders for each product option.`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './VariantSelector.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './VariantSelector.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'VariantSelectorProps',
      description: '',
    },
  ],
};

export default data;
