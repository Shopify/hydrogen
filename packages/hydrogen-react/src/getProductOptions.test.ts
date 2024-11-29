import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  checkProductParam,
  getAdjacentAndFirstAvailableVariants,
  RecursivePartial,
} from './getProductOptions.js';
import {Product} from './storefront-api-types.js';

const ERROR_MSG_START = '[h2:error:getProductOptions] product.';
const ERROR_MSG_END =
  ' is missing. Make sure you query for this field from the Storefront API.';

describe('getAdjacentAndFirstAvailableVariants', () => {
  it('returns the correct number of variants found', () => {
    const variants = getAdjacentAndFirstAvailableVariants({
      options: [
        {
          optionValues: [
            {
              firstSelectableVariant: {
                id: 'snowboard',
                selectedOptions: [
                  {
                    name: 'Color',
                    value: 'Turquoise',
                  },
                ],
              },
            },
          ],
        },
      ],
      selectedOrFirstAvailableVariant: {
        id: 'snowboard',
        selectedOptions: [
          {
            name: 'Color',
            value: 'Turquoise',
          },
        ],
      },
      adjacentVariants: [
        {
          id: 'snowboard-2',
          selectedOptions: [
            {
              name: 'Color',
              value: 'Ember',
            },
          ],
        },
      ],
    } as unknown as RecursivePartial<Product>);

    expect(variants.length).toBe(2);
    expect(variants).toMatchInlineSnapshot(`
      [
        {
          "id": "snowboard",
          "selectedOptions": [
            {
              "name": "Color",
              "value": "Turquoise",
            },
          ],
        },
        {
          "id": "snowboard-2",
          "selectedOptions": [
            {
              "name": "Color",
              "value": "Ember",
            },
          ],
        },
      ]
    `);
  });
});

describe('checkProductParam', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs nothing when provided a valid product input', () => {
    const product = {
      handle: 'snowboard',
      options: [
        {
          name: 'Color',
          optionValues: [
            {
              name: 'Turquoise',
              firstSelectableVariant: {
                product: {
                  handle: 'snowboard',
                },
                selectedOptions: [
                  {
                    name: 'Color',
                    value: 'Turquoise',
                  },
                ],
              },
              swatch: {
                color: '#6cbfc0',
                image: null,
              },
            },
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    };

    const checkedProduct = checkProductParam(
      product as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(0);
    expect(checkedProduct).toBe(product);
  });

  it('logs nothing when provided a valid product input without checkAll flag', () => {
    checkProductParam({
      options: [
        {
          optionValues: [
            {
              firstSelectableVariant: {
                id: 'snowboard',
                selectedOptions: [
                  {
                    name: 'Color',
                    value: 'Turquoise',
                  },
                ],
              },
            },
          ],
        },
      ],
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as RecursivePartial<Product>);

    expect(console.error).toHaveBeenCalledTimes(0);
  });

  it('logs warnings for each missing field when provided an invalid product input and returns an empty object', () => {
    const checkedProduct = checkProductParam(
      {
        id: 'snowboard',
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(6);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}handle${ERROR_MSG_END}`,
    );
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options${ERROR_MSG_END}`,
    );
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}encodedVariantExistence${ERROR_MSG_END}`,
    );
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}encodedVariantAvailability${ERROR_MSG_END}`,
    );
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}selectedOrFirstAvailableVariant${ERROR_MSG_END}`,
    );
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}adjacentVariants${ERROR_MSG_END}`,
    );
    expect(checkedProduct).toStrictEqual({});
  });

  it('logs warnings when provided an invalid options input - missing optionValues', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.name', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            optionValues: [
              {
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.name${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.firstSelectableVariant${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.handle', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.firstSelectableVariant.product.handle${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions.name', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      value: 'Turquoise',
                    },
                  ],
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions.name${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions.value', () => {
    checkProductParam(
      {
        id: 'snowboard',
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                    },
                  ],
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions.value${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.product.handle', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: {
          selectedOptions: [
            {
              name: 'Color',
              value: 'Turquoise',
            },
          ],
        },
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}selectedOrFirstAvailableVariant.product.handle${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: {
          product: {
            handle: 'snowboard',
          },
        },
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions.name', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: {
          product: {
            handle: 'snowboard',
          },
          selectedOptions: [
            {
              value: 'Turquoise',
            },
          ],
        },
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions.name${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions.value', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: {
          product: {
            handle: 'snowboard',
          },
          selectedOptions: [
            {
              name: 'Color',
            },
          ],
        },
        adjacentVariants: [],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions.value${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.product.handle', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [
          {
            selectedOptions: [
              {
                name: 'Color',
                value: 'Turquoise',
              },
            ],
          },
        ],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}adjacentVariants.product.handle${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [
          {
            product: {
              handle: 'snowboard',
            },
          },
        ],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}adjacentVariants.selectedOptions${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions.name', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [
          {
            product: {
              handle: 'snowboard',
            },
            selectedOptions: [
              {
                value: 'Turquoise',
              },
            ],
          },
        ],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}adjacentVariants.selectedOptions.name${ERROR_MSG_END}`,
    );
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions.value', () => {
    checkProductParam(
      {
        handle: 'snowboard',
        options: [
          {
            name: 'Color',
            optionValues: [
              {
                name: 'Turquoise',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Turquoise',
                    },
                  ],
                },
                swatch: {
                  color: '#6cbfc0',
                  image: null,
                },
              },
            ],
          },
        ],
        encodedVariantExistence: '',
        encodedVariantAvailability: '',
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [
          {
            product: {
              handle: 'snowboard',
            },
            selectedOptions: [
              {
                name: 'Color',
              },
            ],
          },
        ],
      } as unknown as RecursivePartial<Product>,
      true,
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      `${ERROR_MSG_START}adjacentVariants.selectedOptions.value${ERROR_MSG_END}`,
    );
  });
});
