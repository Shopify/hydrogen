---
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

- ✨ Add `handleAuthStatus` method to `customerAccountClient` that check for a logged-out customer and redirect to a login page.

- ✨ Automatically redirect customer to the login page during the execution of `query` or `mutate` if a logged-out customer was found.

- ✨ Automatically redirect customer back to the url that execute `query`, `mutate`, or `handleAuthStatus` at the end of oAuth flow when a logged-out customer was found.

---

There are two ways to override the default behavior for logged-out customers, depending on the functionality you need.

- If you want to customize logged-out redirect behavior across your entire application, then pass an `customAuthStatusHandler` function when initializing with `createCustomerAccountClient`.
- If you want to customize the redirect behavior on a case-by-base basis, anywhere in your app, run the `isLoggedIn` function to check whether the customer is logged in and log the customer in. This `isLoggedIn` check must be run before making any `query`, `mutate`, or `handleAuthStatus` calls.
