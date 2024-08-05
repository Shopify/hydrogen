import {Link, useFetcher} from '@remix-run/react';
import {Image, Money} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';

import type {SerializeFrom} from '@shopify/remix-oxygen';
import {action as predictiveSearchAction} from '~/routes/search';

import {useAside} from './Aside';
import {urlWithTrackingParams} from '~/lib/search';

type PredictiveSearchAction = SerializeFrom<typeof predictiveSearchAction>;

type UsePredictiveSearchReturn = ReturnType<typeof usePredictiveSearch>;
type PredictiveSearchItems = NonNullable<UsePredictiveSearchReturn>['items'];

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  'term' | 'total' | 'inputRef'
> & {
  state: UsePredictiveSearchReturn['fetcher']['state'];
  items: PredictiveSearchItems;
  closeSearch: () => void;
};

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
};

/**
 * Component that renders predictive search results
 */
export function SearchResultsPredictive({
  children,
}: SearchResultsPredictiveProps) {
  const aside = useAside();
  const {term, inputRef, fetcher, total, items} = usePredictiveSearch();

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (!inputRef.current) return;
    inputRef.current.blur();
    inputRef.current.value = '';
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput();
    aside.close();
  }

  return children({
    items,
    closeSearch,
    inputRef,
    state: fetcher.state,
    term,
    total,
  });
}

type SearchResultsPredictiveArticlesProps = Pick<
  PredictiveSearchItems,
  'articles'
> &
  Pick<SearchResultsPredictiveArgs, 'term' | 'closeSearch'>;

SearchResultsPredictive.Articles = function ({
  articles,
  closeSearch,
  term,
}: SearchResultsPredictiveArticlesProps) {
  if (!articles.length) return null;

  return (
    <div className="predictive-search-result" key="articles">
      <h5>Articles</h5>
      <ul>
        {articles.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.blog.handle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term: term.current,
          });
          return (
            <li className="predictive-search-result-item" key={article.id}>
              <Link onClick={closeSearch} to={articleUrl}>
                {article.image?.url && (
                  <Image
                    alt={article.image.altText ?? ''}
                    src={article.image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <span>{article.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type SearchResultsPredictiveCollectionsProps = Pick<
  PredictiveSearchItems,
  'collections'
> &
  Pick<SearchResultsPredictiveArgs, 'term' | 'closeSearch'>;

SearchResultsPredictive.Collections = function ({
  collections,
  closeSearch,
  term,
}: SearchResultsPredictiveCollectionsProps) {
  if (!collections.length) return null;

  return (
    <div className="predictive-search-result" key="collections">
      <h5>Collections</h5>
      <ul>
        {collections.map((collection) => {
          const colllectionUrl = urlWithTrackingParams({
            baseUrl: `/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term: term.current,
          });
          return (
            <li className="predictive-search-result-item" key={collection.id}>
              <Link onClick={closeSearch} to={colllectionUrl}>
                {collection.image?.url && (
                  <Image
                    alt={collection.image.altText ?? ''}
                    src={collection.image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <span>{collection.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type SearchResultsPredictivePagesProps = Pick<PredictiveSearchItems, 'pages'> &
  Pick<SearchResultsPredictiveArgs, 'term' | 'closeSearch'>;
SearchResultsPredictive.Pages = function ({
  pages,
  closeSearch,
  term,
}: SearchResultsPredictivePagesProps) {
  if (!pages.length) return null;

  return (
    <div className="predictive-search-result" key="pages">
      <h5>Pages</h5>
      <ul>
        {pages.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term: term.current,
          });
          return (
            <li className="predictive-search-result-item" key={page.id}>
              <Link onClick={closeSearch} to={pageUrl}>
                <div>
                  <span>{page.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type SearchResultsPredictiveProductsProps = Pick<
  PredictiveSearchItems,
  'products'
> &
  Pick<SearchResultsPredictiveArgs, 'term' | 'closeSearch'>;

SearchResultsPredictive.Products = function ({
  products,
  closeSearch,
  term,
}: SearchResultsPredictiveProductsProps) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5>Products</h5>
      <ul>
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          });
          const image = product?.variants?.nodes?.[0].image;
          return (
            <li className="predictive-search-result-item" key={product.id}>
              <Link to={productUrl} onClick={closeSearch}>
                {image && (
                  <Image
                    alt={image.altText ?? ''}
                    src={image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <p>{product.title}</p>
                  <small>
                    {product?.variants?.nodes?.[0].price && (
                      <Money data={product.variants.nodes[0].price} />
                    )}
                  </small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type SearchResultsPredictiveQueriesProps = Pick<
  PredictiveSearchItems,
  'queries'
> &
  Pick<SearchResultsPredictiveArgs, 'term' | 'inputRef'>;

SearchResultsPredictive.Queries = function ({
  queries,
  inputRef,
}: SearchResultsPredictiveQueriesProps) {
  if (!queries.length) return null;

  return (
    <div className="predictive-search-result" key="queries">
      <h5>Queries</h5>
      <ul>
        {queries.map((suggestion) => {
          if (!suggestion) return null;
          return (
            <li className="predictive-search-result-item" key={suggestion.text}>
              <div
                onClick={() => {
                  if (!inputRef.current) return;
                  inputRef.current.value = suggestion.text;
                  inputRef.current.focus();
                }}
                dangerouslySetInnerHTML={{
                  __html: suggestion?.styledText,
                }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

SearchResultsPredictive.Empty = function ({
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
};

type PredictiveSearchResult = {
  items: NonNullable<NonNullable<PredictiveSearchAction['result']>['items']>;
  total: number;
};

const defaultResult = {
  items: {
    articles: [],
    collections: [],
    products: [],
    pages: [],
    queries: [],
  },
  total: 0,
} as PredictiveSearchResult;

/**
 * Hook that returns the predictive search results and fetcher and input ref
 * @returns Predictive search results and fetcher and input ref
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher } = usePredictiveSearch();
 * '''
 **/
function usePredictiveSearch() {
  const fetcher = useFetcher<typeof predictiveSearchAction>({
    key: 'search',
  });
  const term = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (fetcher?.state === 'loading') {
    term.current = String(fetcher.formData?.get('q') || '');
  }

  // capture the search input element as a ref
  useEffect(() => {
    if (inputRef.current) return;
    inputRef.current = document.querySelector('input[type="search"]');
  }, []);

  const {items, total} = !term.current
    ? defaultResult // clear results when the search term is empty
    : ((fetcher?.data?.result || defaultResult) as PredictiveSearchResult);

  return {items, total, inputRef, term, fetcher};
}
