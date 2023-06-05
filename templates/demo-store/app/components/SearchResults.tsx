import React from 'react';
import clsx from 'clsx';
import {Image} from '@shopify/hydrogen-react';
import {useEffect, useRef} from 'react';
import {useFetchers} from '@remix-run/react';

import {Grid, IconSearch, Link} from '~/components';
import type {
  ParsedSearchResults,
  ParsedSearchResultItem,
} from '~/routes/($locale).api.predictive-search';
import type {CommonHeaderProps} from '~/components/Layout';
import {useFeaturedItems} from '~/hooks/useFeaturedItems';
import {usePrefixPathWithLocale} from '~/lib/utils';

export function SearchResults({
  closeSearch,
}: Pick<CommonHeaderProps, 'closeSearch'>) {
  const {
    results,
    totalResults,
    searchInputRef,
    searchInputFocused,
    searchTerm,
  } = useSearch();
  const searchUrl = usePrefixPathWithLocale(`/search?q=${searchTerm.current}`);

  const {setHovered, hovered} = useSearchKeyboardNav({
    searchInputFocused,
    searchTerm: searchTerm.current,
    totalResults,
  });

  function goToSearchResult() {
    closeSearch();
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
  }

  return (
    <div className="flex flex-col mb-4 mt-2 w-full px-6 sm:px-8 md:px-12">
      {!totalResults ? (
        <PopularItems gotoSearchResults={goToSearchResult} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {Object.entries(results).map(([category, items]) => (
              <SearchResultsCategory
                category={category === 'queries' ? 'Suggestions' : category}
                goToSearchResult={goToSearchResult}
                hovered={hovered}
                items={items}
                key={category}
                setHovered={setHovered}
              />
            ))}
          </div>
          {searchTerm.current && (
            <Link
              className={clsx(
                'flex gap-1 items-center border-b border-b-transparent',
                hovered === totalResults &&
                  'border-b-primary dark:border-b-secondary',
              )}
              id={`item-${totalResults}`}
              onClick={goToSearchResult}
              onMouseEnter={() => setHovered(totalResults)}
              onMouseLeave={() => setHovered(null)}
              to={searchUrl}
            >
              <IconSearch />
              <p className="">
                Search for <q>{searchTerm.current}</q>
              </p>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function PopularItems({gotoSearchResults}: {gotoSearchResults: () => void}) {
  const data = useFeaturedItems();
  const productUrlPrefix = usePrefixPathWithLocale('/products');
  const collectionUrlPrefix = usePrefixPathWithLocale('/collections');

  if (!data) return <p>Loading...</p>;

  return (
    <>
      {data.featuredProducts.nodes.length && (
        <section className="mt-8">
          <h6 className="font-bold capitalize mb-4">Popular Products</h6>
          <Grid layout="searchDrawer">
            {data.featuredProducts.nodes.map((product) => {
              const firstVariant = product.variants.nodes[0];
              return (
                <Link
                  className="flex flex-col"
                  key={product.id}
                  onClick={gotoSearchResults}
                  to={`${productUrlPrefix}/${product.handle}`}
                >
                  {firstVariant?.image?.width &&
                    firstVariant?.image?.height && (
                      <Image
                        className=""
                        src={firstVariant.image?.url}
                        alt={firstVariant.image?.altText || product.title}
                        width={200}
                      />
                    )}
                  <h4>{product.title}</h4>
                </Link>
              );
            })}
          </Grid>
        </section>
      )}
      {data.featuredCollections.nodes.length && (
        <section className="mt-8">
          <h6 className="font-bold captitalize mb-4">Popular Collections</h6>
          <Grid layout="searchDrawer">
            {data.featuredCollections.nodes.map((collection) => (
              <Link
                className="flex flex-col"
                key={collection.id}
                onClick={gotoSearchResults}
                to={`${collectionUrlPrefix}/${collection.handle}`}
              >
                {collection.image?.width && collection.image?.height && (
                  <Image
                    className=""
                    src={collection.image?.url}
                    alt={collection.image?.altText || collection.title}
                    width={200}
                  />
                )}
                <h4>{collection.title}</h4>
              </Link>
            ))}
          </Grid>
        </section>
      )}
    </>
  );
}

type SearchResultsCategoryProps = {
  category: string;
  goToSearchResult: () => void;
  hovered: number | null;
  items: ParsedSearchResultItem[];
  setHovered: (position: number | null) => void;
};

function SearchResultsCategory({
  category,
  goToSearchResult,
  hovered,
  items,
  setHovered,
}: SearchResultsCategoryProps) {
  return (
    <div key={category} className="grid gap-1 mb-6">
      <h6 className="font-bold mb-4 capitalize">{category}</h6>
      <ol className="grid gap-2">
        {items.map((item: ParsedSearchResultItem) => (
          <SearchResultItem
            goToSearchResult={goToSearchResult}
            hovered={hovered}
            item={item}
            key={item.id}
            setHovered={setHovered}
          />
        ))}
      </ol>
    </div>
  );
}

type SearchResultItemProps = Pick<
  SearchResultsCategoryProps,
  'goToSearchResult' | 'setHovered' | 'hovered'
> & {
  item: ParsedSearchResultItem;
};

function SearchResultItem({
  goToSearchResult,
  hovered,
  item,
  setHovered,
}: SearchResultItemProps) {
  return (
    <li
      key={item.id}
      className={clsx(
        'overflow-hidden mb-2 border-b',
        hovered === item.position
          ? 'dark:border-b-secondary border-b-primary'
          : 'border-b-transparent',
      )}
    >
      <Link
        className="flex items-center gap-x-2"
        id={`item-${item.position}`}
        onClick={goToSearchResult}
        onMouseEnter={() => setHovered(item.position)}
        onMouseLeave={() => setHovered(null)}
        to={item.url}
      >
        {item.image?.url && (
          <Image
            alt={item.image.altText ?? ''}
            className="w-6 h-6 object-cover"
            height={36}
            src={item.image.url}
            width={36}
          />
        )}
        {item.styledTitle ? (
          <div
            dangerouslySetInnerHTML={{
              __html: item.styledTitle,
            }}
          />
        ) : (
          <span className="truncate flex-grow">{item.title}</span>
        )}
      </Link>
    </li>
  );
}

type UseSearch = ParsedSearchResults & {
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  searchInputFocused: boolean;
  searchTerm: React.MutableRefObject<string>;
};

function useSearch(): UseSearch {
  const fetchers = useFetchers();
  const searchTerm = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFetcher = fetchers.find((fetcher) => fetcher.data?.searchResults);
  const searchInputFocused =
    searchInputRef.current ===
    (typeof document !== 'undefined' && document.activeElement);

  if (searchFetcher?.state === 'loading') {
    searchTerm.current = (searchFetcher.formData?.get('q') || '') as string;
  }

  const search = (searchFetcher?.data?.searchResults || {
    results: null,
    totalResults: 0,
  }) as ParsedSearchResults;

  // capture the search input element as a ref
  // TODO: account for multiple input[type="search"] elements?
  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return {
    ...search,
    searchInputFocused,
    searchInputRef,
    searchTerm,
  };
}

/*
 * This hook handles keyboard navigation for the search results.
 * It adds cmd+n and cmd+p to navigate to the next and previous result.
 * It also adds enter to navigate to the hovered result.
 */
function useSearchKeyboardNav({
  searchInputFocused,
  searchTerm,
  totalResults,
}: {
  searchInputFocused: boolean;
  searchTerm: string;
  totalResults: number;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

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
  }, [searchTerm, totalResults]);

  return {hovered, setHovered};
}
