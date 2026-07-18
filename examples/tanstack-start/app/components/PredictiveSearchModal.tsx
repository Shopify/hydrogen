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
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { content } from "~/lib/content";
import { shopifyImageUrl } from "~/lib/image";
import { formatPrice } from "~/lib/money";
import { routeTemplates } from "~/lib/route-templates";
import { searchParamsToRecord } from "~/lib/search-params";

const PREDICTIVE_SEARCH_LIMIT = 5;
const PREDICTIVE_SEARCH_DIALOG_ID = "search-modal";

/**
 * Predictive search modal (`hydrogen-predictive-search` skill). Opened from the
 * header search trigger. The form is a native `GET /search` fallback so a no-JS
 * shopper reaches full search results (F4). The modal is a centered `<dialog>`
 * (`.dialog-center`). Products only, per `notes/predictive-search.md`.
 */
export function PredictiveSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <PredictiveSearchProvider limit={PREDICTIVE_SEARCH_LIMIT} types={["PRODUCT"]}>
      <PredictiveSearchDialogInner isOpen={isOpen} onClose={onClose} />
    </PredictiveSearchProvider>
  );
}

function PredictiveSearchDialogInner({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const state = usePredictiveSearch();
  const { clear } = usePredictiveSearchActions();
  const { formProps, register } = usePredictiveSearchForm();

  // Open/close the native <dialog> and clear predictive state on close so stale
  // suggestions do not reappear on the next open.
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

  return (
    <dialog
      ref={dialogRef}
      id={PREDICTIVE_SEARCH_DIALOG_ID}
      className="dialog-center"
      aria-labelledby="search-modal-title"
      onClose={onClose}
    >
      <div className="flex h-full flex-col">
        <div className="border-border flex shrink-0 items-center gap-2 border-b p-4">
          <form {...formProps()} role="search" className="flex flex-1 items-center gap-2">
            <label htmlFor="predictive-search-q" className="sr-only">
              {content.search.label}
            </label>
            <input
              id="predictive-search-q"
              type="search"
              {...register("query")}
              placeholder={content.search.placeholder}
              className="flex-1"
              autoComplete="off"
            />
            <button type="submit" className="sr-only">
              {content.search.submit}
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="button-icon inline-flex h-11 w-11 items-center justify-center rounded"
            aria-label={content.general.close}
          >
            <img
              src="/icons/icon-x.svg"
              width="20"
              height="20"
              alt=""
              className="size-5"
              aria-hidden="true"
            />
          </button>
        </div>

        {state.result.term || state.result.items.products.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-4">
            <h2 id="search-modal-title" className="sr-only">
              {content.search.title}
            </h2>
            <PredictiveBody state={state} onNavigate={onClose} />
          </div>
        ) : (
          <h2 id="search-modal-title" className="sr-only">
            {content.search.title}
          </h2>
        )}

        {state.result.items.products.length > 0 ? (
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

function PredictiveBody({
  state,
  onNavigate,
}: {
  state: PredictiveSearchState<PredictiveSearchData>;
  onNavigate: () => void;
}) {
  const { status, error, result } = state;
  const products = result.items.products;
  const hasResults = products.length > 0;
  const term = result.term;

  if (status === "loading") {
    return <p className="text-on-surface-secondary text-sm">Searching…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-sale text-sm">
        {error}
      </p>
    );
  }
  if (status === "success" && !hasResults && term) {
    return (
      <div data-testid="search-modal-empty">
        <p className="text-on-surface text-sm">No results for “{term}”</p>
      </div>
    );
  }
  if (!hasResults) return null;

  return (
    <ul role="listbox" aria-label="Products" className="flex flex-col gap-2">
      {products.map((product) => {
        const href = getPredictiveSearchItemUrl(product, { routes: routeTemplates, term });
        const search = searchParamsToRecord(new URL(href, "https://hydrogen.local").searchParams);
        const variant = product.selectedOrFirstAvailableVariant;
        const image = variant?.image ?? null;
        const price = variant?.price ?? null;
        return (
          <li key={product.id} role="option" aria-selected={false}>
            <Link
              to="/products/$handle"
              params={{ handle: product.handle }}
              search={search}
              onClick={onNavigate}
              className="hover:bg-hover flex items-center gap-3 rounded p-2 no-underline"
            >
              {image ? (
                <img
                  src={shopifyImageUrl(image.url, { width: 64 })}
                  alt={image.altText ?? product.title}
                  className="size-12 rounded object-cover"
                />
              ) : null}
              <span className="flex flex-col">
                <span className="type-body-sm text-on-surface font-medium">{product.title}</span>
                {price ? (
                  <span className="text-on-surface-secondary text-sm">{formatPrice(price)}</span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
