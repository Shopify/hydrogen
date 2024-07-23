import {
  Link,
  Form,
  useParams,
  useFetcher,
  type FormProps,
} from '@remix-run/react';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';
import {urlWithTrackingParams} from '~/lib/search';

import type {
  PredictiveProductFragment,
  PredictiveCollectionFragment,
  PredictiveArticleFragment,
  SearchQuery,
} from 'storefrontapi.generated';

import type {PredictiveSearchAPILoader} from '../routes/api.predictive-search';

type PredicticeSearchResultItemImage =
  | PredictiveCollectionFragment['image']
  | PredictiveArticleFragment['image']
  | PredictiveProductFragment['variants']['nodes'][0]['image'];

type PredictiveSearchResultItemPrice =
  | PredictiveProductFragment['variants']['nodes'][0]['price'];

export type NormalizedPredictiveSearchResultItem = {
  __typename: string | undefined;
  handle: string;
  id: string;
  image?: PredicticeSearchResultItemImage;
  price?: PredictiveSearchResultItemPrice;
  styledTitle?: string;
  title: string;
  url: string;
};

export type NormalizedPredictiveSearchResults = Array<
  | {type: 'queries'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'products'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'collections'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'pages'; items: Array<NormalizedPredictiveSearchResultItem>}
  | {type: 'articles'; items: Array<NormalizedPredictiveSearchResultItem>}
>;

export type NormalizedPredictiveSearch = {
  results: NormalizedPredictiveSearchResults;
  totalResults: number;
};

type FetchSearchResultsReturn = {
  searchResults: {
    results: SearchQuery | null;
    totalResults: number;
  };
  term: string;
};

export const NO_PREDICTIVE_SEARCH_RESULTS: NormalizedPredictiveSearchResults = [
  {type: 'queries', items: []},
  {type: 'products', items: []},
  {type: 'collections', items: []},
  {type: 'pages', items: []},
  {type: 'articles', items: []},
];

type PredictiveSearchFormProps = {
  action?: string;
  children: (args: {
    fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.MutableRefObject<HTMLInputElement | null>;
    fetcher: ReturnType<typeof useFetcher>;
  }) => React.ReactNode;
} & FormProps;

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function PredictiveSearchForm({
  action,
  children,
  className = 'predictive-search-form',
  ...props
}: PredictiveSearchFormProps) {
  const params = useParams();
  const fetcher = useFetcher<PredictiveSearchAPILoader>({
    key: 'search',
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const searchAction = action ?? '/api/predictive-search';
    const newSearchTerm = event.target.value || '';
    const localizedAction = params.locale
      ? `/${params.locale}${searchAction}`
      : searchAction;

    fetcher.submit(
      {q: newSearchTerm, limit: '6'},
      {method: 'GET', action: localizedAction},
    );
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  return (
    <fetcher.Form
      {...props}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!inputRef?.current || inputRef.current.value === '') {
          return;
        }
        inputRef.current.blur();
      }}
    >
      {children({fetchResults, inputRef, fetcher})}
    </fetcher.Form>
  );
}

export function PredictiveSearchResults() {
  const {results, totalResults, searchInputRef, term, state} =
    usePredictiveSearch();

  function goToSearchResult(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
    // close the aside
    window.location.href = event.currentTarget.href;
  }

  if (state === 'loading') {
    return <div>Loading...</div>;
  }

  if (!totalResults) {
    return <NoPredictiveSearchResults term={term} />;
  }

  return (
    <div className="predictive-search-results">
      <div>
        {results.map(({type, items}) => (
          <PredictiveSearchResult
            goToSearchResult={goToSearchResult}
            items={items}
            key={type}
            term={term}
            type={type}
          />
        ))}
      </div>
      {term.current && (
        <Link onClick={goToSearchResult} to={`/search?q=${term.current}`}>
          <p>
            View all results for <q>{term.current}</q>
            &nbsp; →
          </p>
        </Link>
      )}
    </div>
  );
}

function NoPredictiveSearchResults({
  term,
}: {
  term: React.MutableRefObject<string>;
}) {
  if (!term.current) {
    return null;
  }
  return (
    <p>
      No results found for <q>{term.current}</q>
    </p>
  );
}

type SearchResultTypeProps = {
  goToSearchResult: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  items: NormalizedPredictiveSearchResultItem[];
  term: UseSearchReturn['term'];
  type: NormalizedPredictiveSearchResults[number]['type'];
};

function PredictiveSearchResult({
  goToSearchResult,
  items,
  term,
  type,
}: SearchResultTypeProps) {
  const isSuggestions = type === 'queries';
  const categoryUrl = `/search?q=${
    term.current
  }&type=${pluralToSingularSearchType(type)}`;

  return (
    <div className="predictive-search-result" key={type}>
      <Link prefetch="intent" to={categoryUrl} onClick={goToSearchResult}>
        <h5>{isSuggestions ? 'Suggestions' : type}</h5>
      </Link>
      <ul>
        {items.map((item: NormalizedPredictiveSearchResultItem) => (
          <SearchResultItem
            goToSearchResult={goToSearchResult}
            item={item}
            key={item.id}
          />
        ))}
      </ul>
    </div>
  );
}

type SearchResultItemProps = Pick<SearchResultTypeProps, 'goToSearchResult'> & {
  item: NormalizedPredictiveSearchResultItem;
};

function SearchResultItem({goToSearchResult, item}: SearchResultItemProps) {
  return (
    <li className="predictive-search-result-item" key={item.id}>
      <Link onClick={goToSearchResult} to={item.url}>
        {item.image?.url && (
          <Image
            alt={item.image.altText ?? ''}
            src={item.image.url}
            width={50}
            height={50}
          />
        )}
        <div>
          {item.styledTitle ? (
            <div
              dangerouslySetInnerHTML={{
                __html: item.styledTitle,
              }}
            />
          ) : (
            <span>{item.title}</span>
          )}
          {item?.price && (
            <small>
              <Money data={item.price} />
            </small>
          )}
        </div>
      </Link>
    </li>
  );
}

type UseSearchReturn = NormalizedPredictiveSearch & {
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  term: React.MutableRefObject<string>;
  state: ReturnType<typeof useFetcher<PredictiveSearchAPILoader>>['state'];
};

function usePredictiveSearch(): UseSearchReturn {
  const searchFetcher = useFetcher<FetchSearchResultsReturn>({key: 'search'});
  const term = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  if (searchFetcher?.state === 'loading') {
    term.current = (searchFetcher.formData?.get('q') || '') as string;
  }

  const search = (searchFetcher?.data?.searchResults || {
    results: NO_PREDICTIVE_SEARCH_RESULTS,
    totalResults: 0,
  }) as NormalizedPredictiveSearch;

  // capture the search input element as a ref
  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return {...search, searchInputRef, term, state: searchFetcher.state};
}

/**
 * Converts a plural search type to a singular search type
 *
 * @example
 * ```js
 * pluralToSingularSearchType('articles'); // => 'ARTICLE'
 * pluralToSingularSearchType(['articles', 'products']); // => 'ARTICLE,PRODUCT'
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
