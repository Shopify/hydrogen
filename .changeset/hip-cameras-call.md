---
'demo-store': patch
---

It's recommended to update `@shopify/cli`:

```diff
-"@shopify/cli": "3.47.5"
+"@shopify/cli": "3.48.0"
```

Also, for projects using Remix v1 Error Boundary convention, remove the deprecated `ErrorBoundaryComponent` type (or update to the v2 convention):

```diff
-export const ErrorBoundary: ErrorBoundaryComponent = ({error}) => {
+export const ErrorBoundary = ({error}: {error: Error}) => {
```
