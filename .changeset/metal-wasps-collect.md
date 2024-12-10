---
'@shopify/hydrogen': minor
---

Added namespace support to prevent conflicts when using multiple Pagination components:
- New optional `namespace` prop for the `<Pagination/>` component
- New optional `namespace` option for `getPaginationVariables()` utility
- When specified, pagination URL parameters are prefixed with the namespace (e.g., `products_cursor` instead of `cursor`)
- Maintains backwards compatibility when no namespace is provided
