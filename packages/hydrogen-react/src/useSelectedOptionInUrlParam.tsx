import {useEffect} from "react";
import {mapSelectedProductOptionToObject} from "./getProductOptions";
import {SelectedOption} from "./storefront-api-types";

export function useSelectedOptionInUrlParam(selectedOptions: Pick<SelectedOption, 'name' | 'value'>[]) {
  useEffect(() => {
    console.log('effect!');
    const optionsSearchParams = new URLSearchParams(
      mapSelectedProductOptionToObject(
        selectedOptions || [],
      ),
    );
    const currentSearchParams = new URLSearchParams(window.location.search)
    const combinedSearchParams = new URLSearchParams({
      ...Object.fromEntries(currentSearchParams),
      ...Object.fromEntries(optionsSearchParams),
    });

    if (combinedSearchParams.size > 0) {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${combinedSearchParams.toString()}`,
      );
    }
  }, [
    JSON.stringify(selectedOptions),
  ]);

  return null;
}
