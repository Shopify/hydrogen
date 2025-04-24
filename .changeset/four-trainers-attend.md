---
'@shopify/hydrogen': patch
---

Fix the customer account implementation to clear all session data on logout. Previously we would only clear customer account credentials on logout. This change also clears any custom data in the session as well. You can opt out and keep custom data in the session by passing the `keepSession` option to logout:

```js
export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout({
    keepSession: true
  });
}
```
