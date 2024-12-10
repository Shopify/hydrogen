import {useEffect} from 'react';
import {mapSelectedProductOptionToObject} from './getProductOptions.js';
import {SelectedOption} from './storefront-api-types.js';

export function useSelectedOptionInUrlParam(
  selectedOptions: Pick<SelectedOption, 'name' | 'value'>[],
): null {
  useEffect(() => {
    const optionsSearchParams = new URLSearchParams(
      mapSelectedProductOptionToObject(selectedOptions || []),
    );
    const currentSearchParams = new URLSearchParams(window.location.search);

    // ts ignoring the URLSearchParams not iterable error for now
    // https://stackoverflow.com/questions/72522489/urlsearchparams-not-accepting-string#answer-72522838
    // TODO: update ts lib
    const combinedSearchParams = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...Object.fromEntries(currentSearchParams),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
