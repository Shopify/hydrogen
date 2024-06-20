import {useNavigation} from '@remix-run/react';
import {
  Product,
  ProductVariant,
} from '@shopify/hydrogen-react/storefront-api-types';
import {useEffect, useState} from 'react';
import type {PartialDeep} from 'type-fest';

type OptimisticProduct<T> = T & {
  isOptimistic?: boolean;
};

type OptimisticProductInput = Product & {
  selectedVariant?: PartialDeep<ProductVariant>;
};

type OptimisticProductVariants =
  | Array<PartialDeep<ProductVariant>>
  | Promise<Array<PartialDeep<ProductVariant>>>
  | PartialDeep<ProductVariant>
  | Promise<PartialDeep<ProductVariant>>;

/**
 * @param product The product object from `context.storefront.query()` returned by a server loader. The query should use the `selectedVariant` field with `variantBySelectedOptions`.
 * @param variants The available product variants for the product. This can be an array of variants, a promise that resolves to an array of variants, or an object with a `product` key that contains the variants.
 * @returns A new product object where the `selectedVariant` property is set to the variant that matches the current URL search params. If no variant is found, the original product object is returned. The `isOptimistic` property is set to `true` if the `selectedVariant` has been optimistically changed.
 */
export function useOptimisticProduct<
  ProductWithSelectedVariant = OptimisticProductInput,
  Variants = OptimisticProductVariants,
>(
  product: ProductWithSelectedVariant,
  variants: Variants,
): OptimisticProduct<ProductWithSelectedVariant> {
  const navigation = useNavigation();
  const [resolvedVariants, setResolvedVariants] = useState<
    Array<PartialDeep<ProductVariant>>
  >([]);

  useEffect(() => {
    Promise.resolve(variants)
      .then((productWithVariants) => {
        if (productWithVariants) {
          setResolvedVariants(
            productWithVariants instanceof Array
              ? productWithVariants
              : (productWithVariants as PartialDeep<ProductVariant>).product
                  ?.variants?.nodes || [],
          );
        }
      })
      .catch((error) => {
        reportError(
          new Error(
            '[h2:error:useOptimisticProduct] An error occurred while resolving the variants for the optimistic product hook.',
            {
              cause: error,
            },
          ),
        );
      });
  }, [variants]);

  if (navigation.state === 'loading') {
    const queryParams = new URLSearchParams(navigation.location.search);
    let reportedError = false;

    // Find matching variant
    const selectedVariant =
      resolvedVariants.find((variant) => {
        if (!variant.selectedOptions) {
          if (!reportedError) {
            reportedError = true;
            reportError(
              new Error(
                '[h2:error:useOptimisticProduct] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
              ),
            );
          }
          return false;
        }

        return variant.selectedOptions.every((option) => {
          return queryParams.get(option.name) === option.value;
        });
      }) || (product as OptimisticProductInput).selectedVariant;

    if (selectedVariant) {
      return {
        ...product,
        isOptimistic: true,
        selectedVariant,
      };
    }
  }

  return product as OptimisticProduct<ProductWithSelectedVariant>;
}
