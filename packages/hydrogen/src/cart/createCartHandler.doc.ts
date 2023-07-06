import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createCartHandler',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: 'Creates an API that can be used to interact with the cart.',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './createCartHandler.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './createCartHandler.example.ts',
          language: 'ts',
        },
      ],
      title: 'server.(js|ts)',
    },
  },
  definitions: [
    {
      title: 'createCartHandler(options)',
      type: 'CartHandlerOptionsForDocs',
      description: '',
    },
    {
      title: 'Returns',
      type: 'HydrogenCartForDocs',
      description:
        'The handler returns the following default methods. Any [custom](/docs/api/hydrogen/2023-04/utilities/createcarthandler#example-custom-methods) or overwritten methods will also be available in the returned cart instance.',
    },
  ],
  examples: {
    description:
      'Examples of various ways to use the `createCartHandler` utility.',
    exampleGroups: [
      {
        title: 'Cart fragments',
        examples: [
          {
            description:
              'Use `cartQueryFragment` and `cartMutateFragment` to change the cart data the queries will return.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.cartFragments.example.js',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Custom methods',
        examples: [
          {
            description:
              'Define or override methods in your cart handler instance. Note that for addLines, updateDiscountCodes, updateBuyerIdentity, updateNote, updateAttributes, and setMetafields, if you override any of these methods, a new cart will not be created unless you implement the cart creation logic in your overriding method.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.customMethods.example.js',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Cart instance usage',
        examples: [
          {
            description:
              'Add items to the cart. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.addLines',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.addLines.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Create a new cart.',
            codeblock: {
              title: 'cart.create',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.create.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Delete extra information (metafield) from the cart.',
            codeblock: {
              title: 'cart.deleteMetafield',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.metafield.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Retrieve the cart information.',
            codeblock: {
              title: 'cart.get',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.get.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Get the unique identifier of the cart.',
            codeblock: {
              title: 'cart.getCartId',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.getCartId.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Remove items from the cart.',
            codeblock: {
              title: 'cart.removeLines',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.removeLines.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Set the unique identifier of the cart.',
            codeblock: {
              title: 'cart.setCartId',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.setCartId.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Add extra information (metafields) to the cart. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.setMetafields',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.metafield.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Update additional information (attributes) in the cart. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.updateAttributes',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateAttributes.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Update the buyer’s information in the cart. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.updateBuyerIdentity',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateBuyerIdentity.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Update discount codes in the cart.',
            codeblock: {
              title: 'cart.updateDiscountCodes',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateDiscountCodes.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Update items in the cart.',
            codeblock: {
              title: 'cart.updateLines',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateLines.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Update the note in the cart. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.updateNote',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateNote.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Update the selected delivery options in the cart. Only available for carts associated with a customer access token.',
            codeblock: {
              title: 'cart.updateSelectedDeliveryOptions',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './createCartHandler.updateSelectedDeliveryOptions.example.js',
                  language: 'js',
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
