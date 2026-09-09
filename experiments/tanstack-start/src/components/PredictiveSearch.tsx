import {
  getPredictiveSearchItemUrl,
  type PredictiveSearchData,
  type PredictiveSearchState,
} from "@shopify/hydrogen";
import {
  PredictiveSearchProvider,
  usePredictiveSearch,
  usePredictiveSearchActions,
  usePredictiveSearchForm,
} from "@shopify/hydrogen/react";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatPrice } from "~/lib/money";
import { routeTemplates } from "~/lib/route-templates";

const PREDICTIVE_SEARCH_LIMIT = 5;
const PREDICTIVE_SEARCH_DIALOG_ID = "search-modal";

const triggerClass =
  "button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Header search trigger. Server-renders a real `/search` link so the page works
 * before hydration and without JS, then swaps to the predictive-search modal
 * trigger once hydrated.
 */
export function PredictiveSearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const hasHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!hasHydrated) {
    return (
      <Link to="/search" className={triggerClass} aria-label="Search">
        <img src="/icons/icon-search.svg" alt="" className="size-5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClass}
        aria-label="Search"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={PREDICTIVE_SEARCH_DIALOG_ID}
      >
        <img src="/icons/icon-search.svg" alt="" className="size-5" aria-hidden="true" />
      </button>
      <PredictiveSearchProvider limit={PREDICTIVE_SEARCH_LIMIT} types={["PRODUCT"]}>
        <PredictiveSearchDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </PredictiveSearchProvider>
    </>
  );
}

function subscribeToNothing() {
  return () => {};
}

function PredictiveSearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const state = usePredictiveSearch();
  const { clear } = usePredictiveSearchActions();
  const { formProps, register } = usePredictiveSearchForm();

  // Clear predictive state on close so stale suggestions do not reappear.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      clear();
    }
  }, [isOpen, clear]);

  const hasResults = state.result.items.products.length > 0;

  return (
    <dialog
      ref={dialogRef}
      id={PREDICTIVE_SEARCH_DIALOG_ID}
      className="dialog-center"
      aria-labelledby="search-modal-title"
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is part of the <dialog>; only close when the click did
        // not originate inside the content box.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <h2 id="search-modal-title" className="sr-only">
        Search
      </h2>
      <div className="flex h-full flex-col">
        <div className="border-border flex shrink-0 items-center gap-2 border-b p-4">
          <form {...formProps()} role="search" className="flex flex-1 items-center gap-2">
            <label htmlFor="predictive-search-q" className="sr-only">
              Search
            </label>
            <input
              id="predictive-search-q"
              type="search"
              {...register("query")}
              placeholder="Search products"
              className="flex-1"
              autoComplete="off"
              aria-controls="predictive-search-results"
            />
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="button-icon inline-flex h-11 w-11 items-center justify-center rounded"
            aria-label="Close"
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>

        {state.result.term || hasResults ? (
          <div id="predictive-search-results" className="flex-1 overflow-y-auto p-4">
            <PredictiveResults state={state} onNavigate={onClose} />
          </div>
        ) : (
          <div id="predictive-search-results" hidden />
        )}

        {hasResults ? (
          <div className="border-border shrink-0 border-t p-4">
            <Link
              to="/search"
              search={{ q: state.result.term }}
              onClick={onClose}
              className="rounded-button button-secondary inline-flex h-11 w-full items-center justify-center px-4 text-sm font-medium no-underline"
            >
              View all results
            </Link>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

function PredictiveResults({
  state,
  onNavigate,
}: {
  state: PredictiveSearchState<PredictiveSearchData>;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const { status, error, result } = state;
  const products = result.items.products;

  if (status === "loading") {
    return <p className="text-on-surface-secondary text-sm">Searching…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-critical text-sm">
        {error}
      </p>
    );
  }
  if (status === "success" && products.length === 0 && result.term) {
    return (
      <p role="status" aria-live="polite" className="text-on-surface text-sm">
        No results for “{result.term}”
      </p>
    );
  }
  if (products.length === 0) return null;

  return (
    <ul role="list" aria-label="Products" className="flex flex-col gap-2">
      {products.map((product) => {
        const href = getPredictiveSearchItemUrl(product, {
          routes: routeTemplates,
          term: result.term,
        });
        const variant = product.selectedOrFirstAvailableVariant;
        return (
          <li key={product.id}>
            <a
              href={href}
              onClick={(event) => {
                event.preventDefault();
                onNavigate();
                void router.navigate({ href });
              }}
              className="hover:bg-surface-secondary flex items-center gap-3 rounded p-2 no-underline"
            >
              {variant?.image ? (
                <img
                  src={variant.image.url}
                  alt={variant.image.altText ?? product.title}
                  className="size-12 rounded object-cover"
                  loading="lazy"
                />
              ) : null}
              <span className="flex flex-col">
                <span className="type-body-sm text-on-surface font-medium">{product.title}</span>
                {variant?.price ? (
                  <span className="text-on-surface-secondary text-sm">
                    {formatPrice(variant.price)}
                  </span>
                ) : null}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
