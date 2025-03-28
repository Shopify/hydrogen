import type {
  MoneyV2,
  UnitPriceMeasurement,
  Product,
} from './storefront-api-types.js';
import {Money, type MoneyProps, type MoneyPropsBase} from './Money.js';
import type {PartialDeep} from 'type-fest';
import {flattenConnection} from './flatten-connection.js';

export interface ProductPriceProps {
  /** A Storefront API [Product object](https://shopify.dev/api/storefront/reference/products/product). */
  data: PartialDeep<Product, {recurseIntoArrays: true}>;
  /** The type of price. Valid values: `regular` (default) or `compareAt`. */
  priceType?: 'regular' | 'compareAt';
  /** The type of value. Valid values: `min` (default), `max` or `unit`. */
  valueType?: 'max' | 'min' | 'unit';
  /** The ID of the variant. */
  variantId?: string;
}

/**
 * The `ProductPrice` component renders a `Money` component with the product
 * [`priceRange`](https://shopify.dev/api/storefront/reference/products/productpricerange)'s `maxVariantPrice` or `minVariantPrice`, for either the regular price or compare at price range.
 */
export function ProductPrice<
  ComponentGeneric extends React.ElementType = 'div',
>(
  props: ProductPriceProps &
    Omit<MoneyProps<ComponentGeneric>, 'data' | 'measurement'>,
): JSX.Element | null {
  const {
    priceType = 'regular',
    variantId,
    valueType = 'min',
    data: product,
    ...passthroughProps
  } = props;

  if (product == null) {
    throw new Error(`<ProductPrice/> requires a product as the 'data' prop`);
  }

  let price: Partial<MoneyV2> | undefined | null;
  let measurement: Partial<UnitPriceMeasurement> | undefined | null;

  const variant = variantId
    ? flattenConnection(product?.variants ?? {}).find(
        (variant) => variant?.id === variantId,
      ) ?? null
    : null;

  const variantPriceProperty =
    valueType === 'max' ? 'maxVariantPrice' : 'minVariantPrice';

  if (priceType === 'compareAt') {
    if (variantId && variant) {
      price = variant.compareAtPrice;
    } else {
      price = product?.compareAtPriceRange?.[variantPriceProperty];
    }

    let priceAsNumber: number;
    if (variantId && variant) {
      priceAsNumber = parseFloat(variant.price?.amount ?? '0');
    } else {
      priceAsNumber = parseFloat(
        product?.priceRange?.[variantPriceProperty]?.amount ?? '0',
      );
    }

    const compareAtPriceAsNumber = parseFloat(price?.amount ?? '0');

    if (priceAsNumber >= compareAtPriceAsNumber) {
      return null;
    }
  } else {
    if (variantId && variant) {
      price = variant.price;
      if (valueType === 'unit') {
        price = variant.unitPrice;
        measurement = variant.unitPriceMeasurement;
      }
    } else if (valueType === 'max') {
      price = product.priceRange?.maxVariantPrice;
    } else {
      price = product.priceRange?.minVariantPrice;
    }
  }

  if (!price) {
    return null;
  }

  if (measurement) {
    return (
      <Money {...passthroughProps} data={price} measurement={measurement} />
    );
  }

  return <Money {...passthroughProps} data={price} />;
}

// This is only for documentation purposes, and it is not used in the code.
export interface ProductPricePropsForDocs<
  AsType extends React.ElementType = 'div',
> extends Omit<MoneyPropsBase<AsType>, 'data' | 'measurement'>,
    ProductPriceProps {}
