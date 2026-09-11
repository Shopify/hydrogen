import { buildProductSelectionSearchParams, type SelectedOption } from "@shopify/hydrogen";
import { useMemo } from "react";
import { useLocation } from "react-router";

export function useVariantUrl(handle: string, selectedOptions?: SelectedOption[]) {
  const { pathname } = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}

export function getVariantUrl({
  handle,
  optionNames,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  optionNames?: string[];
  pathname: string;
  searchParams: URLSearchParams;
  selectedOptions?: SelectedOption[];
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const localePrefix = match?.[0] ?? "/";

  const path = `${localePrefix}products/${handle}`;

  const params = buildProductSelectionSearchParams({
    selectedOptions: selectedOptions ?? [],
    optionNames: optionNames ?? [],
    base: searchParams,
  });

  const searchString = params.toString();

  return path + (searchString ? "?" + searchString : "");
}
