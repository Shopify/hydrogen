import {afterEach, describe, expect, it, vi} from 'vitest';
import {checkProductParam} from './getProductOptions.js';
import {Product} from './storefront-api-types.js';

const ERROR_MSG_START = '[h2:warn:getProductOptions] product.';
const ERROR_MSG_END = ' is missing. Make sure you query for this field from the Storefront API.';

describe('checkProductParam', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  })

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs nothing when provided a valid product input', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(0);
  });

  it('logs warnings for each missing field when provided an invalid product input', () => {
    checkProductParam({
      id: "snowboard",
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(6);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}handle${ERROR_MSG_END}`);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options${ERROR_MSG_END}`);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}encodedVariantExistence${ERROR_MSG_END}`);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}encodedVariantAvailability${ERROR_MSG_END}`);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}selectedOrFirstAvailableVariant${ERROR_MSG_END}`);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}adjacentVariants${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.name', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          optionValues: [
            {
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.name${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.firstSelectableVariant${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.handle', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.firstSelectableVariant.product.handle${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
              },
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions.name', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    value: "Turquoise"
                  },
                ]
              },
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions.name${ERROR_MSG_END}`);
  });

  it('logs warnings when provided an invalid options input - missing optionValues.firstSelectableVariant.product.selectedOptions.value', () => {
    checkProductParam({
      id: "snowboard",
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                  },
                ]
              },
            }
          ],
        },
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [],
    } as unknown as Product)

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}options.optionValues.firstSelectableVariant.selectedOptions.value${ERROR_MSG_END}`);
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.product.handle', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: {
        selectedOptions: [
          {
            name: "Color",
            value: "Turquoise"
          },
        ]
      },
      adjacentVariants: [],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}selectedOrFirstAvailableVariant.product.handle${ERROR_MSG_END}`);
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: {
        product: {
          handle: "snowboard"
        },
      },
      adjacentVariants: [],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions${ERROR_MSG_END}`);
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions.name', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: {
        product: {
          handle: "snowboard"
        },
        selectedOptions: [
          {
            value: "Turquoise"
          },
        ]
      },
      adjacentVariants: [],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions.name${ERROR_MSG_END}`);
  });

  it('logs warnings when product.selectedOrFirstAvailableVariant is available but is invalid - missing selectedOrFirstAvailableVariant.selectedOptions.value', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: {
        product: {
          handle: "snowboard"
        },
        selectedOptions: [
          {
            name: "Color",
          },
        ]
      },
      adjacentVariants: [],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}selectedOrFirstAvailableVariant.selectedOptions.value${ERROR_MSG_END}`);
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.product.handle', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [{
        selectedOptions: [
          {
            name: "Color",
            value: "Turquoise"
          },
        ]
      }],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}adjacentVariants.product.handle${ERROR_MSG_END}`);
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [{
        product: {
          handle: "snowboard"
        },
      }],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}adjacentVariants.selectedOptions${ERROR_MSG_END}`);
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions.name', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [{
        product: {
          handle: "snowboard"
        },
        selectedOptions: [
          {
            value: "Turquoise"
          },
        ]
      }],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}adjacentVariants.selectedOptions.name${ERROR_MSG_END}`);
  });

  it('logs warnings when product.adjacentVariants is available but is invalid - missing adjacentVariants.selectedOptions.value', () => {
    checkProductParam({
      handle: "snowboard",
      options: [
        {
          name: "Color",
          optionValues: [
            {
              name: "Turquoise",
              firstSelectableVariant: {
                product: {
                  handle: "snowboard"
                },
                selectedOptions: [
                  {
                    name: "Color",
                    value: "Turquoise"
                  },
                ]
              },
              swatch: {
                color: "#6cbfc0",
                image: null
              }
            }
          ],
        }
      ],
      encodedVariantExistence: '',
      encodedVariantAvailability: '',
      selectedOrFirstAvailableVariant: null,
      adjacentVariants: [{
        product: {
          handle: "snowboard"
        },
        selectedOptions: [
          {
            name: "Color",
          },
        ]
      }],
    } as unknown as Product);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(`${ERROR_MSG_START}adjacentVariants.selectedOptions.value${ERROR_MSG_END}`);
  });
});
