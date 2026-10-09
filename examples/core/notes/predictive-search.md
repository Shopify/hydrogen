# Predictive search modal — dynamic map

This note maps the static modal reference in `examples/core/reference/predictive-search.html` to the regenerated framework implementation. The modal is root-level chrome opened from the header search link, but the predictive UI is authored by the search vertical.

## Data and transport

- Register `createPredictiveSearchServerHandlers({types: ["PRODUCT"]})` during bootstrap so browser autocomplete requests use the same request-scoped Storefront client as the app's other Shopify route handlers.
- The default browser endpoint is `/api/predictive-search`; no app import is needed for that path.
- The React implementation wraps the modal island in `PredictiveSearchProvider` configured with `types: ["PRODUCT"]` and renders with `usePredictiveSearch`, `usePredictiveSearchForm`, and `usePredictiveSearchActions` from `@shopify/hydrogen/react`.
- Limit the modal to products only. Do not render collections, pages, articles, or query suggestions in this storefront modal.
- Keep debounce and the minimum term length in the Hydrogen store configuration (`createPredictiveSearchStore` options through the React provider). Do not add a second component-level debounce unless a future UX explicitly needs it.

## Static-to-dynamic states

- **Idle / blank before typing:** render the dialog shell and input row only; do not query, do not show recommendations, and do not render `data-testid="search-modal-empty"` before the shopper types.
- **Loading:** keep the current input and announced status stable while the store requests the current term.
- **Results:** render one labelled Products group inside the `role="listbox"`. Each product result is an `option` and a real link.
- **No results after a query:** render `data-testid="search-modal-empty"` with concise copy, keep the input focused, and keep the native `/search?q=` form behavior available.
- **Error:** render the store error near the input with `role="alert"`; do not write noisy console errors for expected empty or unavailable predictive responses during mock/shop gate runs.

## Layout and surface

- Use the core `.dialog-center` utility for the predictive dialog: full-screen on mobile, then horizontally centered and top-anchored on desktop with `--spacing-search-modal-offset-block-start`, `--spacing-search-modal-width`, `--spacing-dialog-max-height`, the surface/border/radius tokens, `--shadow-xl`, and `--color-overlay-scrim` for `::backdrop`.
- Do not reuse the cart or mobile-nav drawer utilities for predictive search. The modal is not left/right anchored and is not vertically centered.

## Accessibility and keyboard

- The input is a WAI-ARIA combobox: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` pointing at the listbox when results/no-results are rendered, and `aria-activedescendant` when a product option is active.
- The results container uses `role="listbox"`; Products is the only labelled `role="group"` region; each product item uses `role="option"` and maintains a stable id.
- Maintain a polite live region for loading, product result counts, no-results, and error state changes.
- Keyboard map: `ArrowDown`/`ArrowUp` move the active option across products, `Home`/`End` jump within the option list, `Enter` follows the active option or submits the form when no option is active, `Escape` closes the dialog and restores focus to the header trigger, and `Tab` follows normal dialog focus containment.
- Closing the modal clears predictive state with `usePredictiveSearchActions().clear()` so stale suggestions do not reappear on the next open.

## View-all handoff

The pinned **View all results** control appears only when product results exist and submits the predictive form. Use `usePredictiveSearchForm().formProps()` / `register("query")` so the enhanced form still has a native `GET /search` fallback with the `q` parameter. A plain `/search?q=...` link is also acceptable where a form is not used, but it must track the current input value.

## Card data shape

Predictive product items are not the same shape as the full search/collection page `ProductCard` fragment. The modal must either:

1. reuse the existing `ProductCard` styling and tokens while feeding it with a predictive-specific product fragment; or
2. render a documented lightweight modal variant with the same tokens (product image, title, price).

When the modal needs additive predictive fields, the product fragment must be named exactly `PredictiveSearchProductFragment on Product` (core enforces this via `assertFragmentContract`). The page-level `PRODUCT_CARD_FRAGMENT` cannot be passed as-is because it has a different fragment name and expects fields that predictive product items do not always carry. Treat the predictive fragment as the modal's card data contract even though the search results page still owns the no-second-card-fragment convention for browse grids.

## Without JavaScript

Predictive search is a progressive enhancement and must degrade gracefully (engineering.md §F4):

- **The header search trigger is a real `/search` link** (and the shared header ships a `<noscript>` `role="search"` GET form), so a no-JS shopper reaches full search results without the modal ever opening.
- **The modal form is a native `GET /search`** form carrying `q`; with JS off (or before hydration) submitting it lands on the server-rendered search results page. The autocomplete listbox, debounced querying, and keyboard navigation are the enhancement layered on top — none of them gate access to search.
- The “View all results” control and any product option in the listbox resolve to real `/search` / `/products/…` URLs, so even a partially-hydrated modal hands off to real routes.

## Gate prerequisite

Future regeneration runs under tokenless `MOCK_SHOP=1`. Verify that mock.shop serves predictive search through `/api/predictive-search`; if it returns no predictive product items, the modal and gate must render the no-results state after a query without logging browser `console.error` or `pageerror` entries.
