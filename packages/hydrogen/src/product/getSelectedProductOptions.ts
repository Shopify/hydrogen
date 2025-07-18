import type {SelectedOptionInput} from '@shopify/hydrogen-react/storefront-api-types';

export type GetSelectedProductOptions = (request: Request) => SelectedOptionInput[];

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
export const getSelectedProductOptions: GetSelectedProductOptions = (request: Request) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const selectedOptions: SelectedOptionInput[] = [];

  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });

  return selectedOptions;
};