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

type ProductWithVariants = {
  product: {
    variants: {nodes: Array<ProductVariant>};
  };
};

type OptimisticProductVariants =
  | ProductWithVariants
  | Promise<ProductWithVariants>;

export function useOptimisticProduct<
  ProductWithSelectedVariant = OptimisticProductInput,
  ProductVariants = OptimisticProductVariants,
>(
  product: ProductWithSelectedVariant,
  variants: ProductVariants,
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
            (productWithVariants as unknown as ProductWithVariants).product
              .variants.nodes || [],
          );
        }
      })
      .catch((error) => {
        console.error(
          '[h2:error:useOptimisticProduct] An error occurred while resolving the variants for the optimistic product hook.',
          error,
        );
      });
  }, [variants]);

  if (navigation.state === 'loading') {
    const queryParams = new URLSearchParams(navigation.location.search);
    console.log('queryParams', queryParams.get('Color'));

    // Convert the search params to a key-value object
    const params: Record<string, string> = {};
    queryParams.forEach((value, key) => {
      params[key] = value;
    });

    // Find matching variant
    const selectedVariant =
      resolvedVariants.find((variant) => {
        if (!variant.selectedOptions) {
          console.error(
            '[h2:error:useOptimisticProduct] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
          );
          return false;
        }

        return variant.selectedOptions.every((option) => {
          return params[option.name] && params[option.name] === option.value;
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
