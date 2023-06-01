import React from 'react';
import {useEffect, useRef} from 'react';
import {Image} from '@shopify/hydrogen-react';
import {useFetchers, useParams} from '@remix-run/react';
import clsx from 'clsx';

import {IconSearch, Link} from '~/components';
import type {
  ParsedSearchResults,
  ParsedSearchResultItem,
} from '~/routes/($locale).api.predictive-search';

export function SearchResults() {
  const params = useParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputFocused =
    searchInputRef.current ===
    (typeof document !== 'undefined' && document.activeElement);
  const fetchers = useFetchers();
  const searchFetcher = fetchers.find((fetcher) => fetcher.data?.searchResults);
  const searchTerm = useRef<string>('');

  if (searchFetcher?.state === 'loading') {
    searchTerm.current = (searchFetcher.formData?.get('q') || '') as string;
  }

  const searchResults = (searchFetcher?.data?.searchResults || {
    results: null,
    totalResults: 0,
  }) as ParsedSearchResults;

  const {results, totalResults} = searchResults;

  const searchRoute = params.locale
    ? `/${params.locale}/search?q=${searchTerm}`
    : `/search?q=${searchTerm}`;

  const {setHovered, hovered} = useSearchKeyboardNav({
    totalResults: searchResults.totalResults,
    searchTerm: searchTerm.current,
    searchInputFocused,
  });

  function resetSearchInput() {
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
  }

  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  // return searchInputFocused && searchTerm ? (
  return searchInputFocused ? (
    <div className="mt-2 w-full">
      <div className="p-4 flex flex-col gap-4">
        {totalResults > 0 && (
          <div className="flex flex-col gap-4">
            {Object.entries(results).map(([category, items]) => {
              return (
                <div key={category} className="grid gap-1 mb-2">
                  <h6 className="font-bold text-xs uppercase">{category}</h6>
                  <ol className="grid gap-2">
                    {items.map((item: ParsedSearchResultItem) => (
                      <li
                        key={item.id}
                        className={clsx(
                          'overflow-hidden',
                          item.position === hovered ? 'bg-gray-300' : '',
                        )}
                      >
                        <Link
                          className="flex items-center gap-x-2"
                          to={item.url}
                          onClick={resetSearchInput}
                          onMouseEnter={() => setHovered(item.position)}
                          onMouseLeave={() => setHovered(null)}
                          id={`item-${item.position}`}
                        >
                          {item.image?.url && (
                            <Image
                              width={36}
                              height={36}
                              src={item.image.url}
                              className="w-6 h-6 object-cover"
                              alt={item.image.altText ?? ''}
                            />
                          )}
                          <span className="truncate flex-grow">
                            {item.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}

        <Link
          id={`item-${totalResults}`}
          className={clsx(
            'flex gap-1 items-center',
            hovered === totalResults && 'bg-gray-300',
          )}
          to={searchRoute}
          onClick={resetSearchInput}
          onMouseEnter={() => setHovered(totalResults)}
          onMouseLeave={() => setHovered(null)}
        >
          <div>
            <IconSearch />
          </div>
          <p className="text-xs">
            Search for <q>{searchTerm.current}</q>
          </p>
        </Link>
      </div>
    </div>
  ) : null;
}

function useSearchKeyboardNav({
  searchInputFocused,
  searchTerm,
  totalResults,
}: {
  searchTerm: string;
  searchInputFocused: boolean;
  totalResults: number;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  // if ctrl+n is pressed select the next result,
  // if ctrl+p is pressed select the previous result
  useEffect(() => {
    if (!searchInputFocused) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setHovered((prev) => {
          if (prev === null) {
            return 0;
          }
          if (prev + 1 >= totalResults + 1) return prev;
          return prev + 1;
        });
      } else if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        setHovered((prev) => {
          if (prev === null) return prev;
          if (prev - 1 < 0) return prev;
          return prev - 1;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchInputFocused, totalResults, setHovered]);

  // navigate to hovered result when enter is pressed
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (hovered === null) return;
        const hoveredResultLink: HTMLAnchorElement | null =
          document.querySelector(`a#item-${hovered}`);
        hoveredResultLink?.click();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hovered]);

  // reset hovered result when search term changes
  useEffect(() => {
    setHovered(null);
  }, [searchTerm]);

  return {hovered, setHovered};
}
