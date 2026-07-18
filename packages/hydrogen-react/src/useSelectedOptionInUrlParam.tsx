import {useEffect} from 'react';
import {mapSelectedProductOptionToObject} from './getProductOptions.js';
import {SelectedOption} from './storefront-api-types.js';

/** @publicDocs */
export function useSelectedOptionInUrlParam(
  selectedOptions: Pick<SelectedOption, 'name' | 'value'>[],
): null {
  useEffect(() => {
    const optionsSearchParams = new URLSearchParams(
      mapSelectedProductOptionToObject(selectedOptions || []),
    );
    const currentSearchParams = new URLSearchParams(window.location.search);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedOptions)]);

  return null;
}
