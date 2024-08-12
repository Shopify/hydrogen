import {useLocation, useNavigation} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-react';
import type {
  ProductOption,
  ProductVariant,
  ProductVariantConnection,
  SelectedOptionInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import {type ReactNode, useMemo, createElement, Fragment} from 'react';
import type {PartialDeep} from 'type-fest';

export type VariantOption = {
  name: string;
  value?: string;
  values: Array<VariantOptionValue>;
};

export type VariantOptionValue = {
  value: string;
  isAvailable: boolean;
  to: string;
  search: string;
  isActive: boolean;
  variant?: PartialDeep<ProductVariant>;
};

type VariantSelectorProps = {
  /** The product handle for all of the variants */
  handle: string;
  /** Product options from the [Storefront API](/docs/api/storefront/2024-07/objects/ProductOption). Make sure both `name` and `values` are a part of your query. */
  options: Array<PartialDeep<ProductOption>> | undefined;
  /** Product variants from the [Storefront API](/docs/api/storefront/2024-07/objects/ProductVariant). You only need to pass this prop if you want to show product availability. If a product option combination is not found within `variants`, it is assumed to be available. Make sure to include `availableForSale` and `selectedOptions.name` and `selectedOptions.value`. */
  variants?:
    | PartialDeep<ProductVariantConnection>
    | Array<PartialDeep<ProductVariant>>;
  /** By default all products are under /products. Use this prop to provide a custom path. */
  productPath?: string;
  /** Should the VariantSelector wait to update until after the browser navigates to a variant. */
  waitForNavigation?: boolean;
  children: ({option}: {option: VariantOption}) => ReactNode;
};

export function VariantSelector({
  handle,
  options = [],
  variants: _variants = [],
  productPath = 'products',
  waitForNavigation = false,
  children,
}: VariantSelectorProps) {
  const variants =
    _variants instanceof Array ? _variants : flattenConnection(_variants);

  const {searchParams, path, alreadyOnProductPage} = useVariantPath(
    handle,
    productPath,
    waitForNavigation,
  );

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
      return options.map((option) => {
        let activeValue;
        let availableValues: VariantOptionValue[] = [];

        for (let value of option.values!) {
          // The clone the search params for each value, so we can calculate
          // a new URL for each option value pair
          const clonedSearchParams = new URLSearchParams(
            alreadyOnProductPage ? searchParams : undefined,
          );
          clonedSearchParams.set(option.name!, value!);

          // Because we hide options with only one value, they aren't selectable,
          // but they still need to get into the URL
          optionsWithOnlyOneValue.forEach((option) => {
            clonedSearchParams.set(option.name!, option.values![0]!);
          });

          // Find a variant that matches all selected options.
          const variant = variants.find((variant) =>
            variant?.selectedOptions?.every(
              (selectedOption) =>
                clonedSearchParams.get(selectedOption?.name!) ===
                selectedOption?.value,
            ),
          );

          const currentParam = searchParams.get(option.name!);

          const calculatedActiveValue = currentParam
            ? // If a URL parameter exists for the current option, check if it equals the current value
              currentParam === value!
            : false;

          if (calculatedActiveValue) {
            // Save out the current value if it's active. This should only ever happen once.
            // Should we throw if it happens a second time?
            activeValue = value;
          }

          const searchString = '?' + clonedSearchParams.toString();

          availableValues.push({
            value: value!,
            isAvailable: variant ? variant.availableForSale! : true,
            to: path + searchString,
            search: searchString,
            isActive: calculatedActiveValue,
            variant,
          });
        }

        return children({
          option: {
            name: option.name!,
            value: activeValue,
            values: availableValues,
          },
        });
      });
    }, [options, variants, children]),
  );
}

type GetSelectedProductOptions = (request: Request) => SelectedOptionInput[];

/**
 * Extract searchParams from a Request instance and return an array of selected options.
 * @param request - The Request instance to extract searchParams from.
 * @returns An array of selected options.
 * @example Basic usage:
 * ```tsx
 *
 * import {getSelectedProductOptions} from '@shopify/hydrogen';
 *
 * // Given a request url of `/products/product-handle?color=red&size=large`
 *
 * const selectedOptions = getSelectedProductOptions(request);
 *
 * // selectedOptions will equal:
 * // [
 * //   {name: 'color', value: 'red'},
 * //   {name: 'size', value: 'large'}
 * // ]
 * ```
 **/
export const getSelectedProductOptions: GetSelectedProductOptions = (
  request,
) => {
  if (typeof request?.url === 'undefined')
    throw new TypeError(`Expected a Request instance, got ${typeof request}`);

  const searchParams = new URL(request.url).searchParams;

  const selectedOptions: SelectedOptionInput[] = [];

  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  return selectedOptions;
};

function useVariantPath(
  handle: string,
  productPath: string,
  waitForNavigation: boolean,
) {
  const {pathname, search} = useLocation();
  const navigation = useNavigation();

  return useMemo(() => {
    const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
    const isLocalePathname = match && match.length > 0;
    productPath = productPath.startsWith('/')
      ? productPath.substring(1)
      : productPath;

    const path = isLocalePathname
      ? `${match![0]}${productPath}/${handle}`
      : `/${productPath}/${handle}`;

    const searchParams = new URLSearchParams(
      // Remix doesn't update the location until pending loaders complete.
      // By default we use the destination search params to make selecting a variant
      // instant, but `waitForNavigation` makes the UI wait to update by only using
      // the active browser search params.
      waitForNavigation || navigation.state !== 'loading'
        ? search
        : navigation.location.search,
    );

    return {
      searchParams,
      // If the current pathname matches the product page, we need to make sure
      // that we append to the current search params. Otherwise all the search
      // params can be generated new.
      alreadyOnProductPage: path === pathname,
      path,
    };
  }, [pathname, search, waitForNavigation, handle, productPath, navigation]);
}
