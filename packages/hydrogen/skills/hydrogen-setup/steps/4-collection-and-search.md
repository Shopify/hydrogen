# Build Collection And Search Browsing

Invoke the `hydrogen-collection-browser` skill when adding collection routes, search routes, filter sidebars, sort controls, active filter chips, or URL-synced product grids.

## Continue when

- [ ] Filtering and sorting update the URL without scroll reset when hydrated.
- [ ] All stale numeric result metadata shows pending styles while collection filter controls remain interactive (for example, result totals and available-item counts).
- [ ] The collection sort select remains interactive and visually unchanged while loading.
- [ ] Reloading the filtered URL server-renders the same filtered state.
- [ ] With JavaScript disabled, checking filters and submitting the form loads the filtered URL.
- [ ] With JavaScript disabled, the load-more / pagination link loads the next page server-side.
- [ ] With JavaScript enabled, Load more appends products to the current collection results.
- [ ] Hydrated pagination updates the shareable cursor URL while retaining accumulated products.
- [ ] Load previous appears before the collection results; Load more appears after them.
- [ ] Filtering or sorting from a cursor URL starts from the first page without `before` or `after`.
- [ ] Active filter chips remove only one filter, preserve unrelated params, and do not reset scroll when hydrated.
- [ ] Searching with a search term does not erase the search term (preserves `q` search param).
- [ ] Back/forward navigation settles loading state.
