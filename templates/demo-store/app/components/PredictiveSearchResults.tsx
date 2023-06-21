import React from 'react';
import {Image} from '@shopify/hydrogen-react';
import {useEffect, useRef} from 'react';
import {useFetchers} from '@remix-run/react';
import {Money} from '@shopify/hydrogen-react';

import {Grid, IconRightArrow, Link} from '~/components';
import type {CommonHeaderProps} from '~/components/Header';
import {useFeaturedItems} from '~/hooks/useFeaturedItems';
import {
  noPredictiveSearchResults,
  type NormalizedPredictiveSearch,
  type NormalizedPredictiveSearchResults,
  type NormalizedPredictiveSearchResultItem,
} from '~/routes/($locale).api.predictive-search';

export function PredictiveSearchResults({
  closeSearch,
}: Pick<CommonHeaderProps, 'closeSearch'>) {
  const {results, totalResults, searchInputRef, searchTerm} =
    usePredictiveSearch();

  function goToSearchResult() {
    closeSearch();
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
  }

  return (
    <div className="flex flex-col mb-4 mt-2 w-full px-6 sm:px-8 md:px-12">
      {!totalResults ? (
        <NoPredictiveSearchResults
          goToSearchResult={goToSearchResult}
          searchTerm={searchTerm}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {results.map(({type, items}) => (
              <SearchResultType
                goToSearchResult={goToSearchResult}
                items={items}
                key={type}
                searchTerm={searchTerm}
                type={type}
              />
            ))}
          </div>
          {/* search in /search page */}
          {searchTerm.current && (
            <Link
              className="flex gap-1 items-center justify-between"
              onClick={goToSearchResult}
              to={`/search?q=${searchTerm.current}`}
            >
              <p>
                Show all results for <q>{searchTerm.current}</q>
              </p>
              <IconRightArrow />
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function NoPredictiveSearchResults({
  searchTerm,
  goToSearchResult,
}: {
  searchTerm: React.MutableRefObject<string>;
  goToSearchResult: () => void;
}) {
  return (
    <>
      {searchTerm.current && (
        <p className="mb-8">
          No results found for <q>{searchTerm.current}</q>
        </p>
      )}
      <PopularItems goToSearchResult={goToSearchResult} />
    </>
  );
}

function PopularItems({goToSearchResult}: {goToSearchResult: () => void}) {
  const data = useFeaturedItems({productsCount: 4, collectionsCount: 4});

  if (!data) return null;

  return (
    <>
      {data.featuredProducts.nodes.length && (
        <section className="mt-0">
          <h6 className="font-bold capitalize mb-10">Popular Products</h6>
          <Grid layout="searchDrawer" gap="searchDrawer">
            {data.featuredProducts.nodes.map((product) => {
              const firstVariant = product.variants.nodes[0];
              return (
                <Link
                  className="flex flex-col"
                  key={product.id}
                  onClick={goToSearchResult}
                  to={`/products/${product.handle}`}
                >
                  {firstVariant?.image?.width &&
                    firstVariant?.image?.height && (
                      <Image
                        src={firstVariant.image.url}
                        alt={firstVariant.image.altText || product.title}
                        width={196}
                        height={196}
                      />
                    )}
                  <h6 className="mt-4 truncate text-ellipsis">
                    {product.title}
                  </h6>
                  <Money
                    className="text-sm mt-1"
                    data={firstVariant?.price}
                    withoutTrailingZeros
                  />
                </Link>
              );
            })}
          </Grid>
        </section>
      )}
      {data.featuredCollections.nodes.length && (
        <section className="mt-10">
          <h6 className="font-bold captitalize mb-10">Popular Collections</h6>
          <Grid layout="searchDrawer" gap="searchDrawer">
            {data.featuredCollections.nodes.map((collection) => (
              <Link
                className="flex flex-col"
                key={collection.id}
                onClick={goToSearchResult}
                to={`/collections/${collection.handle}`}
              >
                {collection.image?.width && collection.image?.height && (
                  <Image
                    className=""
                    src={collection.image.url}
                    alt={collection.image.altText || collection.title}
                    width={196}
                    height={196}
                  />
                )}
                <h6 className="mt-4 truncate text-ellipsis">
                  {collection.title}
                </h6>
              </Link>
            ))}
          </Grid>
        </section>
      )}
    </>
  );
}

type SearchResultTypeProps = {
  type: NormalizedPredictiveSearchResults[number]['type'];
  goToSearchResult: () => void;
  items: NormalizedPredictiveSearchResultItem[];
  searchTerm: UseSearchReturn['searchTerm'];
};

function SearchResultType({
  type,
  goToSearchResult,
  items,
  searchTerm,
}: SearchResultTypeProps) {
  const isSuggestions = type === 'queries';
  const categoryUrl = `/search?q=${
    searchTerm.current
  }&type=${pluralToSingularSearchType(type)}`;

  return (
    <div key={type} className="flex flex-col mb-8">
      <Link to={categoryUrl} onClick={goToSearchResult}>
        <h6 className="font-bold mb-8 capitalize">
          {isSuggestions ? 'Suggestions' : type}
        </h6>
      </Link>
      <ol className={isSuggestions ? 'block' : 'grid grid-cols-2 gap-8'}>
        {items.map((item: NormalizedPredictiveSearchResultItem) => (
          <SearchResultItem
            goToSearchResult={goToSearchResult}
            item={item}
            key={item.id}
          />
        ))}
      </ol>
    </div>
  );
}

type SearchResultItemProps = Pick<SearchResultTypeProps, 'goToSearchResult'> & {
  item: NormalizedPredictiveSearchResultItem;
};

function SearchResultItem({goToSearchResult, item}: SearchResultItemProps) {
  return (
    <li key={item.id}>
      <Link className="flex flex-col" onClick={goToSearchResult} to={item.url}>
        {item.image?.url && (
          <Image
            alt={item.image.altText ?? ''}
            src={item.image.url}
            width={196}
            height={196}
            className="mb-2"
          />
        )}
        {item.styledTitle ? (
          <div
            dangerouslySetInnerHTML={{
              __html: item.styledTitle,
            }}
          />
        ) : (
          <h6 className="truncate text-ellipsis flex-grow w-100">
            {item.title}
          </h6>
        )}
      </Link>
    </li>
  );
}

type UseSearchReturn = NormalizedPredictiveSearch & {
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  searchTerm: React.MutableRefObject<string>;
};

function usePredictiveSearch(): UseSearchReturn {
  const fetchers = useFetchers();
  const searchTerm = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFetcher = fetchers.find((fetcher) => fetcher.data?.searchResults);

  if (searchFetcher?.state === 'loading') {
    searchTerm.current = (searchFetcher.formData?.get('q') || '') as string;
  }

  const search = (searchFetcher?.data?.searchResults || {
    results: noPredictiveSearchResults,
    totalResults: 0,
  }) as NormalizedPredictiveSearch;

  // capture the search input element as a ref
  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return {...search, searchInputRef, searchTerm};
}

/**
 * Converts a plural search type to a singular search type
 * @param type - The plural search type
 * @returns The singular search type
 *
 * @example
 * ```ts
 * pluralToSingularSearchType('articles') // => 'ARTICLE'
 * pluralToSingularSearchType(['articles', 'products']) // => 'ARTICLE,PRODUCT'
 * ```
 */
function pluralToSingularSearchType(
  type:
    | NormalizedPredictiveSearchResults[number]['type']
    | Array<NormalizedPredictiveSearchResults[number]['type']>,
) {
  const plural = {
    articles: 'ARTICLE',
    collections: 'COLLECTION',
    pages: 'PAGE',
    products: 'PRODUCT',
    queries: 'QUERY',
  };

  if (typeof type === 'string') {
    return plural[type];
  }

  return type.map((t) => plural[t]).join(',');
}
