# Routing & loader traps

Read while doing the routes & imports step. Misses here silently drop routes or leave sections that never render.

- **Import/return-helper sweep.** `@remix-run/react` → `react-router`, `@remix-run/node`/`server-runtime` → `react-router`; `json()`/`defer()` return values change. Miss one and typecheck usually catches it — run `react-router typegen && tsc --noEmit`.
- **Route file convention.** Preserve the existing flat route filenames (e.g. `($locale).*`) via `@react-router/fs-routes`; renaming during migration silently drops routes.
- **Deferred / streamed loader data.** Remix `defer()` + `<Await>` maps to RR7 patterns; a mis-migrated deferred loader can hang (page never reaches network-idle) so a whole section silently doesn't render (commonly a "featured" swimlane or a 404-page section).
- **RR7 `useMatches()[i].handle` is `unknown`.** Any classic-Hydrogen code reading a custom route `handle` (e.g. a per-route layout key) must cast it to the app's handle type before property access — otherwise `tsc` errors on the member. Cast the matched entry's `handle`, not just the `.find` predicate.
