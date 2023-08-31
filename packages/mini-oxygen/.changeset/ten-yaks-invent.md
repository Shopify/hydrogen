---
'@shopify/mini-oxygen': minor
---

- Add a `globalFetch` option to allow for custom fetch implementations.
- Allow returning responses from the `onRequest` hook to intercept requests. This allows for custom handling of requests in a Node.js environment without going into the app sandbox. When returning a response from `onRequest`, the `onResponse` hook will not be called.
- Pass a `defaultDispatcher` function as the second parameter to the `onRequest` hook. Calling this function will dispatch the request to the app sandbox as usual and return the response within the context of the hook. This is useful to wrap each request handling in AsyncLocalStorage.
