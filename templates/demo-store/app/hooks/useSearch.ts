import {useRef} from 'react';
import {useFetcher} from '@remix-run/react';
import {useLocation} from 'react-use';

import type {ParsedSearchResults} from '~/routes/($locale).api.predictive-search';

export function useSearch() {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFetcher = useFetcher<{
    data: {searchResults?: ParsedSearchResults};
  }>();
  const searchResults = searchFetcher?.data?.searchResults ?? null;
  const queryParams = new URLSearchParams(location.search);
  const searchTerm = queryParams.get('q') ?? '';

  function resetSearchInput() {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  }

  return {
    resetSearchInput,
    searchFetcher,
    searchInputRef,
    searchResults,
    searchTerm,
  };
}
