import type { SelectedOption } from "@shopify/hydrogen";
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
  const isLocalePathname = match && match.length > 0;

  const path = isLocalePathname ? `${match![0]}products/${handle}` : `/products/${handle}`;

  optionNames?.forEach((name) => {
    searchParams.delete(name);
  });

  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return path + (searchString ? "?" + searchParams.toString() : "");
}
