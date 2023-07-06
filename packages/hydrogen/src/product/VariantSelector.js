import {useLocation} from '@remix-run/react';
import {flattenConnection} from '@shopify/hydrogen-react';
import {useMemo, createElement, Fragment} from 'react';
export function VariantSelector({
  options = [],
  variants: _variants = [],
  children,
  defaultVariant,
}) {
  const variants =
    _variants instanceof Array ? _variants : flattenConnection(_variants);
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
      return (
        options
          // Only show options with more than one value
          .filter((option) => option?.values?.length > 1)
          .map((option) => {
            let activeValue;
            let availableValues = [];
            for (let value of option.values) {
              // The clone the search params for each value, so we can calculate
              // a new URL for each option value pair
              const clonedSearchParams = new URLSearchParams(searchParams);
              clonedSearchParams.set(option.name, value);
              // Because we hide options with only one value, they aren't selectable,
              // but they still need to get into the URL
              optionsWithOnlyOneValue.forEach((option) => {
                clonedSearchParams.set(option.name, option.values[0]);
              });
              // Find a variant that matches all selected options.
              const variant = variants.find((variant) =>
                variant?.selectedOptions?.every(
                  (selectedOption) =>
                    clonedSearchParams.get(selectedOption?.name) ===
                    selectedOption?.value,
                ),
              );
              const currentParam = searchParams.get(option.name);
              const calculatedActiveValue = currentParam
                ? // If a URL parameter exists for the current option, check if it equals the current value
                  currentParam === value
                : defaultVariant
                ? // Else check if the default variant has the current option value
                  defaultVariant.selectedOptions?.some(
                    (selectedOption) =>
                      selectedOption?.name === option.name &&
                      selectedOption?.value === value,
                  )
                : false;
              if (calculatedActiveValue) {
                // Save out the current value if it's active. This should only ever happen once.
                // Should we throw if it happens a second time?
                activeValue = value;
              }
              availableValues.push({
                value: value,
                isAvailable: variant ? variant.availableForSale : true,
                path: path + '?' + clonedSearchParams.toString(),
                isActive: Boolean(calculatedActiveValue),
              });
            }
            return children({
              option: {
                name: option.name,
                value: activeValue,
                values: availableValues,
              },
            });
          })
      );
    }, [options, variants, children]),
  );
}
export const getSelectedProductOptions = (request) => {
  if (!(request instanceof Request))
    throw new TypeError(`Expected a Request instance, got ${typeof request}`);
  const searchParams = new URL(request.url).searchParams;
  const selectedOptions = [];
  searchParams.forEach((value, name) => {
    selectedOptions.push({name, value});
  });
  return selectedOptions;
};
export function getFirstAvailableVariant(variants = []) {
  return (
    variants instanceof Array ? variants : flattenConnection(variants)
  ).find((variant) => variant?.availableForSale);
}
