import {Link, useParams, useFetcher, type FormProps} from '@remix-run/react';
import {
  Image,
  Money,
  type PredictiveSearchHandlerReturn,
} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';
import type {loader as searchLoader} from '../routes/search';

export const NO_PREDICTIVE_SEARCH_RESULTS = {
  resources: [
    {type: 'queries', items: []},
    {type: 'products', items: []},
    {type: 'collections', items: []},
    {type: 'pages', items: []},
    {type: 'articles', items: []},
  ],
  total: 0,
} as PredictiveSearchHandlerReturn['result'];

type ChildrenRenderProps = {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetcher: ReturnType<typeof useFetcher<typeof searchLoader>>;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
};

type SearchFromProps = {
  action?: FormProps['action'];
  className?: string;
  children: (passedProps: ChildrenRenderProps) => React.ReactNode;
  [key: string]: unknown;
};

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function PredictiveSearchForm({
  action,
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFromProps) {
  const params = useParams();
  const fetcher = useFetcher<typeof searchLoader>({
    key: 'predictive-search',
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const searchAction = action ?? '/search';
    const newSearchTerm = event.target.value || '';
    const localizedAction = params.locale
      ? `/${params.locale}${searchAction}`
      : searchAction;

    // TODO: All predictive search options should be configurable i.e. limit, resources..
    fetcher.submit(
      {q: newSearchTerm, limit: '10', type: 'predictive'},
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
  const {result, inputRef, term, state} = usePredictiveSearch();

  function goToSearchResult(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!inputRef.current) return;
    inputRef.current.blur();
    inputRef.current.value = '';
    // close the aside
    window.location.href = event.currentTarget.href;
  }

  if (state === 'loading') {
    return <div>Loading...</div>;
  }

  if (!result.total) {
    return <NoPredictiveSearchResults term={term} />;
  }

  return (
    <div className="predictive-search-results">
      <div>
        {result.resources.map(({type, items}) => (
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
          <PredictiveSearchResultItem
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

function PredictiveSearchResultItem({
  goToSearchResult,
  item,
}: SearchResultItemProps) {
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

type UseSearchReturn = Omit<PredictiveSearchHandlerReturn, 'term'> & {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  term: React.MutableRefObject<string>;
  state: ReturnType<typeof useFetcher<typeof searchLoader>>['state'];
};

function usePredictiveSearch(): UseSearchReturn {
  const searchFetcher = useFetcher<{
    predictiveSearch: PredictiveSearchHandlerReturn;
  }>({
    key: 'predictive-search',
  });
  const term = useRef('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (searchFetcher?.state === 'loading') {
    term.current = String(searchFetcher.formData?.get('q') || '');
  }

  const predictiveSearch =
    searchFetcher?.data?.predictiveSearch ||
    ({
      result: NO_PREDICTIVE_SEARCH_RESULTS,
      term: '',
      type: 'predictive',
    } as PredictiveSearchHandlerReturn);

  // capture the search input element as a ref
  useEffect(() => {
    if (inputRef.current) return;
    inputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return {
    ...predictiveSearch,
    inputRef,
    term,
    state: searchFetcher.state,
  };
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
