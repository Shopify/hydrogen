import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  checkProductParam,
  getAdjacentAndFirstAvailableVariants,
  getProductOptions,
  mapSelectedProductOptionToObject,
  RecursivePartial,
} from './getProductOptions.js';
import {Product} from './storefront-api-types.js';

const ERROR_MSG_START = '[h2:error:getProductOptions] product.';
const ERROR_MSG_END =
  ' is missing. Make sure you query for this field from the Storefront API.';

describe('getProductOptions', () => {
  it('returns the options array with variant information', () => {
    const options = getProductOptions(
      PRODUCT as unknown as RecursivePartial<Product>,
    );
    expect(options).toMatchInlineSnapshot(`
      [
        {
          "name": "Size",
          "optionValues": [
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "154cm",
              "selected": true,
              "swatch": null,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=154cm&Color=Sea+Green+%2F+Desert",
            },
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290646584",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "158cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "158cm",
              "selected": false,
              "swatch": null,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290646584",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "158cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=158cm&Color=Sea+Green+%2F+Desert",
            },
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290679352",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "160cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "160cm",
              "selected": false,
              "swatch": null,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290679352",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "160cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=160cm&Color=Sea+Green+%2F+Desert",
            },
          ],
        },
        {
          "name": "Color",
          "optionValues": [
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "Sea Green / Desert",
              "selected": true,
              "swatch": null,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=154cm&Color=Sea+Green+%2F+Desert",
            },
          ],
        },
      ]
    `);
  });

  it('returns the options array with variant information even if one of the optionValue returns a null firstSelectableVariant', () => {
    const options = getProductOptions(
      PRODUCT_2 as unknown as RecursivePartial<Product>,
    );
    expect(options).toMatchInlineSnapshot(`
      [
        {
          "name": "Size",
          "optionValues": [
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "154cm",
              "selected": true,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=154cm&Color=Sea+Green+%2F+Desert",
            },
            {
              "available": false,
              "exists": true,
              "firstSelectableVariant": null,
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "158cm",
              "selected": false,
              "variant": null,
              "variantUriQuery": "",
            },
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290679352",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "160cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "160cm",
              "selected": false,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290679352",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "160cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=160cm&Color=Sea+Green+%2F+Desert",
            },
          ],
        },
        {
          "name": "Color",
          "optionValues": [
            {
              "available": true,
              "exists": true,
              "firstSelectableVariant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "handle": "mail-it-in-freestyle-snowboard",
              "isDifferentProduct": false,
              "name": "Sea Green / Desert",
              "selected": true,
              "variant": {
                "availableForSale": true,
                "id": "gid://shopify/ProductVariant/41007290613816",
                "product": {
                  "handle": "mail-it-in-freestyle-snowboard",
                },
                "selectedOptions": [
                  {
                    "name": "Size",
                    "value": "154cm",
                  },
                  {
                    "name": "Color",
                    "value": "Sea Green / Desert",
                  },
                ],
              },
              "variantUriQuery": "Size=154cm&Color=Sea+Green+%2F+Desert",
            },
          ],
        },
      ]
    `);
  });
});

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

describe('mapSelectedProductOptionToObject', () => {
  it('returns the selected option in an object form', () => {
    const option = mapSelectedProductOptionToObject([
      {
        name: 'Color',
        value: 'Turquoise',
      },
      {
        name: 'Size',
        value: 'Small',
      },
    ]);

    expect(option).toMatchInlineSnapshot(`
      {
        "Color": "Turquoise",
        "Size": "Small",
      }
    `);
  });
});

describe('checkProductParam', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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
            name: 'Color',
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

  it('does not log warnings when provided options has one of the optionValue that is returning a null firstSelectableVariant', () => {
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
                firstSelectableVariant: null,
              },
              {
                name: 'Ember',
                firstSelectableVariant: {
                  product: {
                    handle: 'snowboard',
                  },
                  selectedOptions: [
                    {
                      name: 'Color',
                      value: 'Ember',
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

    expect(console.error).toHaveBeenCalledTimes(0);
  });
});

const PRODUCT = {
  id: 'gid://shopify/Product/6730949034040',
  handle: 'mail-it-in-freestyle-snowboard',
  encodedVariantExistence: 'v1_0:0,1:0,2:0,',
  encodedVariantAvailability: 'v1_0:0,1:0,2:0,',
  options: [
    {
      name: 'Size',
      optionValues: [
        {
          name: '154cm',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290613816',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '154cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
          swatch: null,
        },
        {
          name: '158cm',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290646584',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '158cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
          swatch: null,
        },
        {
          name: '160cm',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290679352',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '160cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
          swatch: null,
        },
      ],
    },
    {
      name: 'Color',
      optionValues: [
        {
          name: 'Sea Green / Desert',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290613816',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '154cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
          swatch: null,
        },
      ],
    },
  ],
  selectedOrFirstAvailableVariant: {
    availableForSale: true,
    id: 'gid://shopify/ProductVariant/41007290613816',
    product: {
      handle: 'mail-it-in-freestyle-snowboard',
    },
    selectedOptions: [
      {
        name: 'Size',
        value: '154cm',
      },
      {
        name: 'Color',
        value: 'Sea Green / Desert',
      },
    ],
  },
  adjacentVariants: [
    {
      availableForSale: true,
      id: 'gid://shopify/ProductVariant/41007290646584',
      product: {
        handle: 'mail-it-in-freestyle-snowboard',
      },
      selectedOptions: [
        {
          name: 'Size',
          value: '158cm',
        },
        {
          name: 'Color',
          value: 'Sea Green / Desert',
        },
      ],
    },
    {
      availableForSale: true,
      id: 'gid://shopify/ProductVariant/41007290679352',
      product: {
        handle: 'mail-it-in-freestyle-snowboard',
      },
      selectedOptions: [
        {
          name: 'Size',
          value: '160cm',
        },
        {
          name: 'Color',
          value: 'Sea Green / Desert',
        },
      ],
    },
  ],
};

const PRODUCT_2 = {
  id: 'gid://shopify/Product/6730949034040',
  handle: 'mail-it-in-freestyle-snowboard',
  encodedVariantExistence: 'v1_0:0,1:0,2:0,',
  encodedVariantAvailability: 'v1_0:0,2:0,',
  options: [
    {
      name: 'Size',
      optionValues: [
        {
          name: '154cm',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290613816',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '154cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
        },
        {
          name: '158cm',
          firstSelectableVariant: null,
        },
        {
          name: '160cm',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290679352',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '160cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
        },
      ],
    },
    {
      name: 'Color',
      optionValues: [
        {
          name: 'Sea Green / Desert',
          firstSelectableVariant: {
            availableForSale: true,
            id: 'gid://shopify/ProductVariant/41007290613816',
            product: {
              handle: 'mail-it-in-freestyle-snowboard',
            },
            selectedOptions: [
              {
                name: 'Size',
                value: '154cm',
              },
              {
                name: 'Color',
                value: 'Sea Green / Desert',
              },
            ],
          },
        },
      ],
    },
  ],
  selectedOrFirstAvailableVariant: {
    availableForSale: true,
    id: 'gid://shopify/ProductVariant/41007290613816',
    product: {
      handle: 'mail-it-in-freestyle-snowboard',
    },
    selectedOptions: [
      {
        name: 'Size',
        value: '154cm',
      },
      {
        name: 'Color',
        value: 'Sea Green / Desert',
      },
    ],
  },
  adjacentVariants: [
    {
      availableForSale: true,
      id: 'gid://shopify/ProductVariant/41007290679352',
      product: {
        handle: 'mail-it-in-freestyle-snowboard',
      },
      selectedOptions: [
        {
          name: 'Size',
          value: '160cm',
        },
        {
          name: 'Color',
          value: 'Sea Green / Desert',
        },
      ],
    },
  ],
};
