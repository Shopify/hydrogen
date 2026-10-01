import { getPredictiveSearchItemUrl, getSearchResultUrl } from "@shopify/hydrogen";
import type { PredictiveSearchProductItem, PredictiveSearchState } from "@shopify/hydrogen";
import {
  PredictiveSearchProvider,
  usePredictiveSearch,
  usePredictiveSearchActions,
  usePredictiveSearchForm,
} from "@shopify/hydrogen/react";
import { useRef } from "react";
import { Link, useNavigate } from "react-router";

import { SEARCH_DRAWER_ID, closeSearchDrawer } from "~/lib/cart-drawer";
import { formatPrice } from "~/lib/money";
import { describeSuggestions } from "~/lib/predictive-search";
import { routeTemplates } from "~/lib/route-templates";

const SEARCH_PAGE_PATH = "/search";
const TITLE_ID = "search-drawer-title";
const INPUT_ID = "search-drawer-query";
const RESULTS_ID = "search-drawer-results";

export function SearchDrawer() {
  return (
    <PredictiveSearchProvider searchAction={SEARCH_PAGE_PATH}>
      <SearchDialog />
    </PredictiveSearchProvider>
  );
}

function SearchDialog() {
  const navigate = useNavigate();
  const { clear } = usePredictiveSearchActions();
  const { formProps, register } = usePredictiveSearchForm();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <dialog
      id={SEARCH_DRAWER_ID}
      className="drawer-right bg-surface text-on-surface"
      aria-labelledby={TITLE_ID}
      data-testid="search-drawer"
      closedby="any"
      onClose={() => {
        // Assigning through the element keeps React's input value tracker in
        // sync. form.reset() bypasses it, so a later paste of the same term
        // would land on the stale tracked value and never fire onChange.
        if (inputRef.current) inputRef.current.value = "";
        clear();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 py-2 ps-4 pe-2">
          <h2 id={TITLE_ID} className="sr-only">
            Search
          </h2>
          <form
            {...formProps({
              className: "relative flex-1",
              "aria-labelledby": TITLE_ID,
              onSubmit: (event, term) => {
                event.preventDefault();
                closeSearchDrawer();
                void navigate(getSearchResultUrl({ baseUrl: SEARCH_PAGE_PATH, term }));
              },
            })}
          >
            <label htmlFor={INPUT_ID} className="sr-only">
              Search products
            </label>
            <span
              className="text-on-surface-secondary pointer-events-none absolute start-3 top-1/2 inline-flex size-5 -translate-y-1/2"
              aria-hidden="true"
            >
              <img src="/icons/icon-search.svg" alt="" className="size-5" />
            </span>
            <input
              ref={inputRef}
              {...register("query", {
                id: INPUT_ID,
                placeholder: "Search",
                "aria-controls": RESULTS_ID,
                className: "h-11 w-full ps-10",
                onKeyDown: (event) => {
                  // Chromium spends the first Escape on clearing a type=search
                  // input, which would stop the dialog's own Escape handling.
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  closeSearchDrawer();
                },
              })}
            />
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>
          <button
            type="button"
            commandfor={SEARCH_DRAWER_ID}
            command="close"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close"
            onClick={() => closeSearchDrawer()}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <SearchSuggestions />
      </div>
    </dialog>
  );
}

function SearchSuggestions() {
  const state = usePredictiveSearch();
  const { status, result, term } = state;

  return (
    <div id={RESULTS_ID} className="flex-1 overflow-y-auto p-4" aria-busy={status === "loading"}>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {describeSuggestions(state)}
      </p>
      <SuggestionsBody status={status} result={result} />
      {term.length > 0 ? (
        <Link
          to={getSearchResultUrl({ baseUrl: SEARCH_PAGE_PATH, term })}
          className="text-on-surface focus-visible:outline-accent mt-4 inline-flex min-h-11 items-center text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => closeSearchDrawer()}
        >
          View all results for “{term}”
        </Link>
      ) : null}
    </div>
  );
}

type SuggestionsBodyProps = Pick<PredictiveSearchState, "status" | "result">;

function SuggestionsBody({ status, result }: SuggestionsBodyProps) {
  switch (status) {
    case "idle":
      return null;
    case "error":
      return (
        <p role="alert" className="text-critical text-sm">
          Suggestions are unavailable right now. Use the full search page instead.
        </p>
      );
    case "loading":
      if (result.items.products.length === 0) {
        return <p className="text-on-surface-secondary text-sm">Searching…</p>;
      }
      return <SuggestionList products={result.items.products} term={result.term} stale />;
    case "success":
      if (result.items.products.length === 0) {
        return <p className="text-on-surface-secondary text-sm">No results for “{result.term}”</p>;
      }
      return <SuggestionList products={result.items.products} term={result.term} />;
  }
}

type SuggestionListProps = {
  products: readonly PredictiveSearchProductItem[];
  term: string;
  stale?: boolean;
};

function SuggestionList({ products, term, stale = false }: SuggestionListProps) {
  return (
    <ul role="list" className={stale ? "grid gap-1 opacity-60" : "grid gap-1"}>
      {products.map((product) => (
        <li key={product.id}>
          <SuggestionLink product={product} term={term} />
        </li>
      ))}
    </ul>
  );
}

function SuggestionLink({ product, term }: { product: PredictiveSearchProductItem; term: string }) {
  const variant = product.selectedOrFirstAvailableVariant;
  const image = variant?.image ?? null;

  return (
    <Link
      to={getPredictiveSearchItemUrl(product, { routes: routeTemplates, term })}
      className="hover:bg-surface-secondary focus-visible:outline-accent flex items-center gap-3 rounded p-2 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
      onClick={() => closeSearchDrawer()}
    >
      {image !== null ? (
        <img
          src={image.url}
          alt={image.altText ?? ""}
          width={48}
          height={48}
          className="bg-surface-secondary size-12 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <span className="bg-surface-secondary size-12 shrink-0 rounded" aria-hidden="true" />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="type-body-sm text-on-surface line-clamp-2 font-medium">
          {product.title}
        </span>
        {variant !== null ? (
          <span className="text-on-surface-secondary text-sm">{formatPrice(variant.price)}</span>
        ) : null}
      </span>
    </Link>
  );
}
