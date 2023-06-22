import {useLocation} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-react';
import {
  Product,
  ProductOption,
  ProductVariant,
  ProductVariantConnection,
  SelectedOptionInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import {ReactNode, useMemo, createElement, Fragment} from 'react';
import type {PartialDeep} from 'type-fest';

type AvailableOption = {
  name: string;
  value?: string;
  variants: Array<Variant>;
};

type Variant = {
  value: string;
  isAvailable: boolean;
  path: string;
  isActive: boolean;
};

type VariantSelectorProps = {
  options: Array<PartialDeep<ProductOption>> | undefined;
  variants: PartialDeep<ProductVariantConnection>;
  children: ({option}: {option: AvailableOption}) => ReactNode;
  defaultVariant?: ProductVariant;
};

export function VariantSelector({
  options = [],
  variants,
  children,
  defaultVariant,
}: VariantSelectorProps) {
  const {pathname, search} = useLocation();

  const {searchParams, path} = useMemo(() => {
    const isLocalePathname = /\/[a-zA-Z]{2}-[a-zA-Z]{2}\//g.test(pathname);
    const path = isLocalePathname
      ? `/${pathname.split('/').slice(2).join('/')}`
      : pathname;

    const searchParams = new URLSearchParams(search);

    return {
      searchParams: searchParams,
      path,
    };
  }, [pathname, search]);

  // If an option only has one value, it doesn't need a UI to select it
  // But instead it always needs to be added to the product options so
  // the SFAPI properly finds the variant
  const optionsWithOnlyOneValue = options.filter(
    (option) => option?.values?.length === 1,
  );

  return createElement(
    Fragment,
    null,
    ...useMemo(() => {
      return options
        .filter((option) => option?.values?.length! > 1)
        .map((option) => {
          let activeValue;
          let availableVariants: Variant[] = [];

          for (let value of option.values!) {
            const clonedSearchParams = new URLSearchParams(searchParams);
            clonedSearchParams.set(option.name!, value!);

            optionsWithOnlyOneValue.forEach((option) => {
              clonedSearchParams.set(option.name!, option.values![0]!);
            });

            const variant = flattenConnection(variants).find((variant) =>
              variant?.selectedOptions?.every(
                (selectedOption) =>
                  clonedSearchParams.get(selectedOption?.name!) ===
                  selectedOption?.value,
              ),
            );

            const currentParam = searchParams.get(option.name!);

            const calculatedActiveValue = currentParam
              ? currentParam === value!
              : defaultVariant
              ? defaultVariant.selectedOptions?.some(
                  (selectedOption) =>
                    selectedOption?.name === option.name &&
                    selectedOption?.value === value,
                )
              : false;

            if (calculatedActiveValue) {
              activeValue = value;
            }

            availableVariants.push({
              value: value!,
              isAvailable: variant ? variant.availableForSale! : true,
              path: path + '?' + clonedSearchParams.toString(),
              isActive: calculatedActiveValue,
            });
          }

          return children({
            option: {
              name: option.name!,
              value: activeValue,
              variants: availableVariants,
            },
          });
        });
    }, [options, variants, children]),
  );
}

export function getSelectedProductOptions(
  request: Request,
): SelectedOptionInput[] {
  if (!(request instanceof Request))
    throw new TypeError(`Expected a Request instance, got ${typeof request}`);

  const searchParams = new URL(request.url).searchParams;

  const selectedOptions: SelectedOptionInput[] = [];

  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  return selectedOptions;
}

export function getFirstAvailableVariant(product: Product) {
  return flattenConnection(product.variants).find(
    (variant) => variant?.availableForSale,
  );
}
