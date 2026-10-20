import {
  getPredictiveSearchItemUrl,
  type PredictiveSearchData,
  type PredictiveSearchResourceItem,
  type PredictiveSearchStatus,
} from "@shopify/hydrogen";
import {
  usePredictiveSearchActions,
  usePredictiveSearch as usePredictiveSearchState,
} from "@shopify/hydrogen/react";
import React, { useRef, useEffect } from "react";
import { Link } from "react-router";

import { Image } from "~/components/Image";
import { formatMoney } from "~/lib/money";
import { routeTemplates } from "~/lib/route-templates";

import { useAside } from "./Aside";

const PREDICTIVE_SEARCH_THUMBNAIL_SIZE = 50;

type PredictiveSearchItems = PredictiveSearchData["items"];

type UsePredictiveSearchReturn = {
  term: React.MutableRefObject<string>;
  total: number;
  error: string | null;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  items: PredictiveSearchItems;
  status: PredictiveSearchStatus;
};

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  "error" | "term" | "total" | "inputRef" | "items"
> & {
  state: PredictiveSearchStatus;
  closeSearch: () => void;
};

type PartialPredictiveSearchResult<
  ItemType extends keyof PredictiveSearchItems,
  ExtraProps extends keyof SearchResultsPredictiveArgs = "term" | "closeSearch",
> = Pick<PredictiveSearchItems, ItemType> & Pick<SearchResultsPredictiveArgs, ExtraProps>;

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
};

function getPredictiveSearchResourceUrl(item: PredictiveSearchResourceItem, term: string): string {
  return getPredictiveSearchItemUrl(item, {
    routes: routeTemplates,
    term,
  });
}

export function SearchResultsPredictive({ children }: SearchResultsPredictiveProps) {
  const aside = useAside();
  const { clear } = usePredictiveSearchActions();
  const { error, term, inputRef, status, total, items } = usePredictiveSearchResults();

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.value = "";
    }
  }

  function closeSearch() {
    resetInput();
    clear();
    aside.close();
  }

  return children({
    error,
    items,
    closeSearch,
    inputRef,
    state: status,
    term,
    total,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;

function SearchResultsPredictiveQueries({
  queries,
  closeSearch,
}: PartialPredictiveSearchResult<"queries", "closeSearch">) {
  if (!queries.length) return null;

  return (
    <div className="predictive-search-result" key="queries">
      <h5>Suggestions</h5>
      <ul>
        {queries.map((query) => {
          return (
            <li className="predictive-search-result-item" key={query.text}>
              <Link onClick={closeSearch} to={getPredictiveSearchItemUrl(query)}>
                <span>{query.text}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictiveArticles({
  term,
  articles,
  closeSearch,
}: PartialPredictiveSearchResult<"articles">) {
  if (!articles.length) return null;

  return (
    <div className="predictive-search-result" key="articles">
      <h5>Articles</h5>
      <ul>
        {articles.map((article) => {
          return (
            <li className="predictive-search-result-item" key={article.id}>
              <Link
                onClick={closeSearch}
                to={getPredictiveSearchResourceUrl(article, term.current)}
              >
                {article.image?.url && (
                  <Image
                    alt={article.image.altText ?? ""}
                    src={article.image.url}
                    width={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
                    height={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
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
}

function SearchResultsPredictiveCollections({
  term,
  collections,
  closeSearch,
}: PartialPredictiveSearchResult<"collections">) {
  if (!collections.length) return null;

  return (
    <div className="predictive-search-result" key="collections">
      <h5>Collections</h5>
      <ul>
        {collections.map((collection) => {
          return (
            <li className="predictive-search-result-item" key={collection.id}>
              <Link
                onClick={closeSearch}
                to={getPredictiveSearchResourceUrl(collection, term.current)}
              >
                {collection.image?.url && (
                  <Image
                    alt={collection.image.altText ?? ""}
                    src={collection.image.url}
                    width={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
                    height={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
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
}

function SearchResultsPredictivePages({
  term,
  pages,
  closeSearch,
}: PartialPredictiveSearchResult<"pages">) {
  if (!pages.length) return null;

  return (
    <div className="predictive-search-result" key="pages">
      <h5>Pages</h5>
      <ul>
        {pages.map((page) => {
          return (
            <li className="predictive-search-result-item" key={page.id}>
              <Link onClick={closeSearch} to={getPredictiveSearchResourceUrl(page, term.current)}>
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
}

function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<"products">) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5>Products</h5>
      <ul>
        {products.map((product) => {
          const price = product.selectedOrFirstAvailableVariant?.price;
          const image = product.selectedOrFirstAvailableVariant?.image;
          return (
            <li className="predictive-search-result-item" key={product.id}>
              <Link
                to={getPredictiveSearchResourceUrl(product, term.current)}
                onClick={closeSearch}
              >
                {image && (
                  <Image
                    alt={image.altText ?? ""}
                    src={image.url}
                    width={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
                    height={PREDICTIVE_SEARCH_THUMBNAIL_SIZE}
                  />
                )}
                <div>
                  <p>{product.title}</p>
                  <small>{price ? formatMoney(price) : null}</small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictiveEmpty({ term }: { term: React.MutableRefObject<string> }) {
  if (!term.current) {
    return null;
  }

  return (
    <p>
      No results found for <q>{term.current}</q>
    </p>
  );
}

function usePredictiveSearchResults(): UsePredictiveSearchReturn {
  const state = usePredictiveSearchState();
  const term = useRef<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  term.current = state.term;

  useEffect(() => {
    if (!inputRef.current) {
      inputRef.current = document.querySelector('input[type="search"]');
    }
  }, []);

  const { items, total } = state.result;

  return { error: state.error, items, total, inputRef, term, status: state.status };
}
