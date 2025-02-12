---
'@shopify/hydrogen': patch
---

Added the ability to provide `language` data to `createCustomerAccountClient`, and automatically pass it down to it from `createHydrogenContext`.
The provided `language` will be used to set the `uilocales` property in the Customer Account API request.

Calls to `login()` will use the provided `language` without having to pass it explicitly via `uiLocales`; however, if the `login()` method is
already using its `uilocales` property, the `language` parameter coming from the context/constructor will be ignored. If nothing is explicitly passed, `login()` will default to `context.i18n.language`.

```ts
const customerAccount = createCustomerAccountClient({
  // ...
  language,
});
```

```ts
export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login({
    uiLocales: 'FR', // will be used instead of the one coming from the context
  });
}
```
