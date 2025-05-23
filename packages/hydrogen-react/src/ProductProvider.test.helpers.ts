import type {
  ProductVariant,
  Product as ProductType,
  SellingPlanAllocationConnection,
  ProductVariantConnection,
  MoneyV2,
  SellingPlanGroupConnection,
} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';
import {faker} from '@faker-js/faker';
import {getRawMetafield} from './parse-metafield.test.helpers.js';
import {getUnitPriceMeasurement, getPrice} from './Money.test.helpers.js';
import {getPreviewImage} from './Image.test.helpers.js';
import {getMedia} from './MediaFile.test.helpers.js';

export function getProduct(
  product: PartialDeep<ProductType, {recurseIntoArrays: true}> = {},
): PartialDeep<ProductType, {recurseIntoArrays: true}> {
  return {
    id: product.id ?? faker.string.uuid(),
    handle: product.handle ?? faker.word.noun(),
    title: product.title ?? faker.word.words(),
    descriptionHtml: product.descriptionHtml ?? `<p>${faker.word.words()}</p>`,
    priceRange: {
      maxVariantPrice: getPrice(product.priceRange?.maxVariantPrice),
      minVariantPrice: getPrice(product.priceRange?.minVariantPrice),
    },
    compareAtPriceRange: {
      maxVariantPrice: getPrice(product.compareAtPriceRange?.maxVariantPrice),
      minVariantPrice: getPrice(product.compareAtPriceRange?.minVariantPrice),
    },
    media: product.media ?? {
      nodes: [getMedia(), getMedia(), getMedia(), getMedia(), getMedia()],
    },
    variants: product.variants ?? {
      nodes: [
        getVariant(),
        getVariant(),
        getVariant(),
        getVariant(),
        getVariant(),
        getVariant(),
        getVariant(),
      ],
    },
    metafields: product.metafields ?? [
      getRawMetafield(),
      getRawMetafield(),
      getRawMetafield(),
    ],
    sellingPlanGroups: product.sellingPlanGroups ?? {nodes: []},
  };
}

export function getVariant(
  variant: PartialDeep<ProductVariant, {recurseIntoArrays: true}> = {},
): PartialDeep<ProductVariant, {recurseIntoArrays: true}> {
  const price = getPrice(variant.price);
  const compareAtPrice = getPrice(variant.compareAtPrice ?? undefined);

  return {
    id: variant.id ?? faker.word.words(),
    title: variant.title ?? faker.word.words(),
    availableForSale: variant.availableForSale ?? faker.datatype.boolean(),
    image: getPreviewImage(variant?.image ?? undefined),
    unitPrice: getPrice(variant?.unitPrice ?? undefined),
    unitPriceMeasurement: getUnitPriceMeasurement(
      variant?.unitPriceMeasurement ?? undefined,
    ),
    price,
    compareAtPrice,
    selectedOptions: [
      {name: faker.word.noun(), value: faker.word.noun()},
      {name: faker.word.noun(), value: faker.word.noun()},
    ],
    // sellingPlanAllocations: [],
    metafields: variant.metafields ?? [
      getRawMetafield(),
      getRawMetafield(),
      getRawMetafield(),
    ],
  };
}

const price: MoneyV2 = {
  amount: '9.99',
  currencyCode: 'CAD',
};

export const VARIANTS: PartialDeep<
  ProductVariantConnection,
  {recurseIntoArrays: true}
> = {
  nodes: [
    {
      id: '1',
      title: 'Black / Small',
      selectedOptions: [
        {
          name: 'Color',
          value: 'Black',
        },
        {
          name: 'Size',
          value: 'Small',
        },
      ],
      availableForSale: true,
      unitPrice: price,
      unitPriceMeasurement: getUnitPriceMeasurement(),
      price,
      metafields: [],
    },
    {
      id: '2',
      title: 'Black / Large',
      selectedOptions: [
        {
          name: 'Color',
          value: 'Black',
        },
        {
          name: 'Size',
          value: 'Large',
        },
      ],
      availableForSale: true,
      unitPrice: price,
      unitPriceMeasurement: getUnitPriceMeasurement(),
      price,
      metafields: [],
    },
    {
      id: '3',
      title: 'White / Small',
      selectedOptions: [
        {
          name: 'Color',
          value: 'White',
        },
        {
          name: 'Size',
          value: 'Small',
        },
      ],
      availableForSale: true,
      unitPrice: price,
      unitPriceMeasurement: getUnitPriceMeasurement(),
      price,
      metafields: [],
    },
    {
      id: '4',
      title: 'White / Large',
      selectedOptions: [
        {
          name: 'Color',
          value: 'White',
        },
        {
          name: 'Size',
          value: 'Large',
        },
      ],
      availableForSale: false,
      unitPrice: price,
      unitPriceMeasurement: getUnitPriceMeasurement(),
      price,
      metafields: [],
    },
  ],
};

export const SELLING_PLAN_GROUPS_CONNECTION: PartialDeep<
  SellingPlanGroupConnection,
  {recurseIntoArrays: true}
> = {
  nodes: [
    {
      name: 'Subscribe & Save',
      options: [
        {
          name: 'Deliver every',
          values: ['week', '2 weeks'],
        },
      ],
      sellingPlans: {
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        nodes: [
          {
            id: 'abc',
            name: 'Deliver every week',
            options: [
              {
                name: 'Deliver every',
                value: 'week',
              },
            ],
            priceAdjustments: [],
            recurringDeliveries: false,
          },
          {
            id: 'def',
            name: 'Deliver every 2 weeks',
            options: [
              {
                name: 'Deliver every',
                value: '2 weeks',
              },
            ],
            priceAdjustments: [],
            recurringDeliveries: false,
          },
        ],
      },
    },
  ],
};

export const VARIANTS_WITH_SELLING_PLANS: PartialDeep<
  ProductVariantConnection,
  {recurseIntoArrays: true}
> = {
  nodes: (VARIANTS.nodes ?? []).map((edge) => {
    const sellingPlanAllocations: PartialDeep<
      SellingPlanAllocationConnection,
      {recurseIntoArrays: true}
    > = {
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      nodes: [
        {
          sellingPlan: {
            id: 'abc',
            name: 'Deliver every week',
            options: [
              {
                name: 'Deliver every',
                value: 'week',
              },
            ],
            priceAdjustments: [],
            recurringDeliveries: false,
          },
          priceAdjustments: [
            {
              price: {
                amount: '10',
                currencyCode: 'USD',
              },
              compareAtPrice: {
                amount: '10',
                currencyCode: 'USD',
              },
              perDeliveryPrice: {
                amount: '10',
                currencyCode: 'USD',
              },
              unitPrice: {
                amount: '10',
                currencyCode: 'USD',
              },
            },
          ],
        },
        {
          sellingPlan: {
            id: 'def',
            name: 'Deliver every 2 weeks',
            options: [
              {
                name: 'Deliver every',
                value: '2 weeks',
              },
            ],
            priceAdjustments: [],
            recurringDeliveries: false,
          },
          priceAdjustments: [
            {
              price: {
                amount: '9',
                currencyCode: 'USD',
              },
              compareAtPrice: {
                amount: '9',
                currencyCode: 'USD',
              },
              perDeliveryPrice: {
                amount: '9',
                currencyCode: 'USD',
              },
              unitPrice: {
                amount: '9',
                currencyCode: 'USD',
              },
            },
          ],
        },
      ],
    };

    return {
      ...edge,
      sellingPlanAllocations,
    };
  }),
};
