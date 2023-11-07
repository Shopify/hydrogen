---
'skeleton': patch
---

Since Remix is now a peer dependency of `@shopify/remix-oxygen`, you need to add `@remix-run/server-runtime` to your dependencies with the same version you have for the rest of Remix dependencies.

```diff
"dependencies": {
  "@remix-run/react": "2.1.0"
+ "@remix-run/server-runtime": "2.1.0"
  ...
}
```
