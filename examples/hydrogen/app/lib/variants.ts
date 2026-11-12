import { buildProductSelectionSearchParams, type SelectedOption } from "@shopify/hydrogen";
import { useLocale } from "@shopify/hydrogen/react";
import { useMemo } from "react";

export function useVariantUrl(handle: string, selectedOptions?: SelectedOption[]) {
  const { pathPrefix } = useLocale();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathPrefix,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathPrefix]);
}

export function getVariantUrl({
  handle,
  optionNames,
  pathPrefix,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  optionNames?: string[];
  /** The locale path prefix of the page, from `useLocale()`. */
  pathPrefix: string;
  searchParams: URLSearchParams;
  selectedOptions?: SelectedOption[];
}) {
  const path = `${pathPrefix}/products/${handle}`;

  const params = buildProductSelectionSearchParams({
    selectedOptions: selectedOptions ?? [],
    optionNames: optionNames ?? [],
    base: searchParams,
  });

  const searchString = params.toString();

  return path + (searchString ? "?" + searchString : "");
}
