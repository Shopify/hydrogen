---
"@shopify/hydrogen": patch
---

A cart form submission now redirects to the same-origin `return_to` search param of the form's action, such as `/api/cart?return_to=/cart`, before the referring page. The cart handlers also no longer redirect a form submission back to the cart endpoint itself. A client router that commits the URL before it sends the form, such as Remix 3's, sends the cart endpoint as the `Referer`, so the redirect showed the cart JSON as the page. Such a submission now redirects to `/` unless the action has a `return_to`.
