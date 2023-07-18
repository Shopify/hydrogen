import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getSelectedProductOptions',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'VariantSelector',
      type: 'components',
      url: '/docs/api/hydrogen/2023-04/components/variantselector',
    },
    {
      name: 'getFirstAvailableVariant',
      type: 'utilities',
      url: '/docs/api/hydrogen/2023-04/utilities/getfirstavailablevariant',
    },
  ],
  description: `The \`getSelectedProductOptions\` returns the selected options from the Request search parameters. The selected options can then be easily passed to your GraphQL query with [\`variantBySelectedOptions\`](https://shopify.dev/docs/api/storefront/2023-04/objects/product#field-product-variantbyselectedoptions).`,
  type: 'component',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './getSelectedProductOptions.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './getSelectedProductOptions.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'GetSelectedProductOptions',
      description: '',
    },
  ],
};

export default data;
