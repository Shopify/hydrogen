import React, {useEffect} from 'react';
import {Image} from '@shopify/hydrogen-react';
import {useParams} from '@remix-run/react';
import clsx from 'clsx';

import {IconSearch, Link} from '~/components';
import type {
  ParsedSearchResults,
  ParsedSearchResultItem,
} from '~/routes/($locale).api.predictive-search';

export function SearchResultsDrawer({
  searchInputRef,
  searchResults,
}: {
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  searchResults: ParsedSearchResults;
}) {
  const {results, totalResults} = searchResults;
  const params = useParams();
  const [hoveredResult, setHoveredResult] = React.useState<number | null>(null);
  const searchTerm = searchInputRef.current?.value || '';
  const searchInputFocused =
    searchInputRef.current ===
    (typeof document !== 'undefined' && document.activeElement);

  const searchRoute = params.locale
    ? `/${params.locale}/search?q=${searchTerm}`
    : `/search?q=${searchTerm}`;

  function resetSearchInput() {
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
  }

  // if ctrl+n is pressed select the next result,
  // if ctrl+p is pressed select the previous result
  useEffect(() => {
    if (!searchInputFocused) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setHoveredResult((prev) => {
          if (prev === null) {
            return 0;
          }
          if (prev + 1 >= totalResults + 1) return prev;
          return prev + 1;
        });
      } else if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        setHoveredResult((prev) => {
          if (prev === null) return prev;
          if (prev - 1 < 0) return prev;
          return prev - 1;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchInputFocused, totalResults, setHoveredResult]);

  // navigate to hovered result when enter is pressed
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (hoveredResult === null) return;
        const hoveredResultLink: HTMLAnchorElement | null =
          document.querySelector(`a#item-${hoveredResult}`);
        hoveredResultLink?.click();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hoveredResult]);

  // reset hovered result when search term changes
  useEffect(() => {
    setHoveredResult(null);
  }, [searchTerm]);

  // return searchInputFocused && searchTerm ? (
  return searchInputFocused ? (
    <div className="absolute top-full mt-2 w-full">
      <div className="bg-white text-gray-800 p-4 flex flex-col gap-4">
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
                          item.position === hoveredResult
                            ? 'bg-gray-300'
                            : 'text-black',
                        )}
                      >
                        <Link
                          className="flex items-center gap-x-2"
                          to={item.url}
                          onClick={resetSearchInput}
                          onMouseEnter={() => setHoveredResult(item.position)}
                          onMouseLeave={() => setHoveredResult(null)}
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
                          <div className="truncate text-xs flex-grow">
                            {item.title}
                          </div>
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
            hoveredResult === totalResults ? 'bg-gray-300' : 'text-black',
          )}
          to={searchRoute}
          onClick={resetSearchInput}
          onMouseEnter={() => setHoveredResult(totalResults)}
          onMouseLeave={() => setHoveredResult(null)}
        >
          <div>
            <IconSearch />
          </div>
          <p className="text-xs">
            Search for <q>{searchTerm}</q>
          </p>
        </Link>
      </div>
    </div>
  ) : null;
}
