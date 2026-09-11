---
'@shopify/hydrogen': minor
---

Synchronize cart buyer identity with Customer Account sessions. Pass `customerSession` to `createCartServerHandlers` to create new carts with the current customer's buyer identity when the session has a usable access token or successfully refreshed access token, and mark checkout URLs in authenticated cart reads with `logged_in=true`. Pass those cart handlers as `cartServerHandlers` to `createCustomerAccountServerHandlers` to keep existing carts in step: authorization and refresh attach the customer to the browser cart, a definitive refresh rejection and logout detach it. Sync is best-effort and never blocks the route's redirect; a failed detach during logout or definitive refresh rejection expires the cart cookie instead.
