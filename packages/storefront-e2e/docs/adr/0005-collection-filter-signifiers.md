# ADR 0005: Collection and filter signifiers

- Status: Accepted for issue #1289 (2026-10-15)
- Issue: [#1289](https://github.com/Shopify/developer-tools-team/issues/1289)
- Related: [accepted scope](https://github.com/Shopify/developer-tools-team/issues/1289#issuecomment-6206407770), [ADR 0001](0001-standard-signifiers.md), [ADR 0002](0002-nuxt-signifier-coverage.md)
- Scope of this record: product cards and collection filter value controls

## Context

The collection checks used product link paths, product titles, checkbox positions, and counts parsed from English labels to discover targets. These details do not identify the product card or Storefront API filter value reliably.

ADR 0001 defines the shared signifier schema, serialization, runner match rules, and production behavior. This record extends that foundation. It does not change event behavior.

## Decision

Add two entries to the shared schema:

| Signifier | Required state | Placement |
| --- | --- | --- |
| `product-card` | `{ productHandle: string }` | Product card root |
| `collection-filter-value` | `{ filterId: string }` | Actual filter value checkbox |

`productHandle` is the product handle, not a product ID. `filterId` is the Storefront API **filter value** `id`, not the parent filter `id`. Keep the field name `filterId`.

The public core helpers are `getProductCardAttributes(product: {handle: string})` in `product/card.ts` and `getFilterValueAttributes(value: AvailableFilterValue)` in `collection/form.ts`. React and Vue re-export these pure getters. They need no provider, controller, state hook, or register function. A full filter value argument lets TypeScript reject a parent filter.

The helpers return signifier attributes only. Callers keep their native link, checkbox, checked state, form name and value, handlers, disabled state, wrapping label, and accessibility attributes. React Router and Next.js keep the native product link inside the card. Nuxt keeps its existing native link as the card root. No layout wrapper is added.

Read-only discovery retains value IDs, input, counts, and product handles. It finds narrowing LIST or BOOLEAN values by API count, not by display label. The runner finds cards by handle and probes these value IDs for an enabled, unchecked native checkbox with a visible control or wrapping label. Partial filter presentation is valid; the first API value need not be rendered. If no candidate is usable, the contract fails with candidate IDs, reasons, and remediation. Only a missing data prerequisite is a skip.

Result checks count visible signified product cards once per handle. They require non-empty results, fewer rendered products after filtering, and no more rendered products than the selected value's API count. A rendered page can be paginated, so its count is not the API total count. Browser Back must restore the URL, unchecked state of the same value ID, and rendered card count.

## Plan change

There is no existing collection register model. Adding one, or adding stateful binding hooks for these getters, would expand the API without a consumer need. Use the pure getters instead.

Do not add `collection-filter-apply`: no migrated check requires it. The existing optional Apply filters/Show results semantic fallback remains. The existing wrapping-label action remains for visually hidden native checkboxes. Remove only the obsolete discovery allowlist entries; add no exceptions.

## Consequences

- Product titles and filter labels can change without changing target identity.
- Native product navigation, checkbox behavior, and existing internal events stay unchanged.
- Missing live filter data or a filter that cannot narrow the rendered page still causes a prerequisite skip. A skip is not a pass.
- Unit and type checks cover getter output, binding exports, parent-filter rejection, API value selection, and rendered-card counting. The coordinator owns the combined React Router, Next.js, and Nuxt browser checks; this record does not claim those checks passed.
