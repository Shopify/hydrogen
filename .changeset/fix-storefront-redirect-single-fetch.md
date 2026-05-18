---
'@shopify/hydrogen': patch
---

Fix `storefrontRedirect` not working for client-side navigations. React Router v7's Single Fetch changed how data requests work — they now use a `.data` pathname suffix instead of a `_data` query parameter. `storefrontRedirect` now correctly detects both conventions, strips the `.data` suffix before matching redirects, and returns the proper `204` status code for soft navigation redirect responses.
