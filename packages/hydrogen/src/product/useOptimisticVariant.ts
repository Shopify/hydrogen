import {useNavigation} from '@remix-run/react';
import {ProductVariant} from '@shopify/hydrogen-react/storefront-api-types';
import {useEffect, useState} from 'react';
import type {PartialDeep} from 'type-fest';

type OptimisticVariant<T> = T & {
  isOptimistic?: boolean;
};

type OptimisticVariantInput = PartialDeep<ProductVariant>;

type OptimisticProductVariants =
  | Array<PartialDeep<ProductVariant>>
  | Promise<Array<PartialDeep<ProductVariant>>>
  | PartialDeep<ProductVariant>
  | Promise<PartialDeep<ProductVariant>>;

/**
 * @param selectedVariant The `selectedVariant` field queried with `variantBySelectedOptions`.
 * @param variants The available product variants for the product. This can be an array of variants, a promise that resolves to an array of variants, or an object with a `product` key that contains the variants.
 * @returns A new product object where the `selectedVariant` property is set to the variant that matches the current URL search params. If no variant is found, the original product object is returned. The `isOptimistic` property is set to `true` if the `selectedVariant` has been optimistically changed.
 */
export function useOptimisticVariant<
  SelectedVariant = OptimisticVariantInput,
  Variants = OptimisticProductVariants,
>(
  selectedVariant: SelectedVariant,
  variants: Variants,
): OptimisticVariant<SelectedVariant> {
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
            '[h2:error:useOptimisticVariant] An error occurred while resolving the variants for the optimistic product hook.',
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
    const matchingVariant = resolvedVariants.find((variant) => {
      if (!variant.selectedOptions) {
        if (!reportedError) {
          reportedError = true;
          reportError(
            new Error(
              '[h2:error:useOptimisticVariant] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
            ),
          );
        }
        return false;
      }

      return variant.selectedOptions.every((option) => {
        return queryParams.get(option.name) === option.value;
      });
    });

    if (matchingVariant) {
      return {
        ...matchingVariant,
        isOptimistic: true,
      } as OptimisticVariant<SelectedVariant>;
    }
  }

  return selectedVariant as OptimisticVariant<SelectedVariant>;
}
