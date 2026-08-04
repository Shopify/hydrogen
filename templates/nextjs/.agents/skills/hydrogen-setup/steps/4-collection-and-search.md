# Build Collection And Search Browsing

Invoke the `hydrogen-collection-browser` skill when adding collection routes, search routes, filter sidebars, sort controls, active filter chips, or URL-synced product grids.

## Continue when

- [ ] Filtering and sorting update the URL without scroll reset when hydrated.
- [ ] Reloading the filtered URL server-renders the same filtered state.
- [ ] With JavaScript disabled, checking filters and submitting the form loads the filtered URL.
- [ ] With JavaScript disabled, the load-more / pagination link loads the next page server-side.
- [ ] Active filter chips remove only one filter and preserve unrelated params.
- [ ] Searching with a search term does not erase the search term (preserves `q` search param).
- [ ] Back/forward navigation settles loading state.