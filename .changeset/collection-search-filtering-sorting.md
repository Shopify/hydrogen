---
"skeleton": patch
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Add collection and search filtering & sorting to skeleton template

- **Collection filtering**: Collections now support product filters (list, swatch, and price range) via URL parameters using the Storefront API's `ProductFilter` input. Filters are rendered with a new `CollectionFilters` component and managed through `productFilters` utility functions.
- **Collection sorting**: Collections now support sorting via a `CollectionSort` dropdown component. Sort options include Featured, Price, Best Selling, Alphabetical, and Date.
- **Search filtering & sorting**: The search page now returns and renders product filters and supports sort options (Relevance, Price).
- **Bug fix**: Fixed article search result URLs from `/blogs/{articleHandle}` to `/blogs/{blogHandle}/{articleHandle}`.
- **New files**: `CollectionFilters`, `CollectionSort`, `PriceRangeFilter` components and `productFilters`, `productSort` utility libraries.
