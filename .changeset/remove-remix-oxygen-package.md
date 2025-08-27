---
'@shopify/hydrogen': minor
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Remove `@shopify/remix-oxygen` package and migrate to React Router 7

This change removes the `@shopify/remix-oxygen` package as part of Hydrogen's migration from Remix to React Router 7 + Vite. The package had become a thin wrapper that mostly re-exported React Router functionality.

## Breaking Changes

The `@shopify/remix-oxygen` package has been removed. Update your imports:

**Before:**
```typescript
import {LoaderFunctionArgs, redirect} from '@shopify/remix-oxygen';
import {createRequestHandler} from '@shopify/remix-oxygen';
```

**After:**
```typescript
import {LoaderFunctionArgs, redirect} from 'react-router';
import {createRequestHandler} from '@shopify/hydrogen/oxygen';
```

## What's Changed

- **Type exports**: All types like `LoaderFunctionArgs`, `ActionFunctionArgs`, `HeadersFunction`, etc. are now imported directly from `react-router`
- **Utility functions**: Functions like `redirect`, `json`, and `defer` are now imported from `react-router`
- **Request handler**: The `createRequestHandler` function for Oxygen deployments is now available from `@shopify/hydrogen/oxygen`
- **Storefront headers**: The `getStorefrontHeaders` utility is now exported from `@shopify/hydrogen`

## Migration Required

All projects using `@shopify/remix-oxygen` need to update their imports. The skeleton template and examples have been updated to use the new import paths.

The functionality remains the same - this is primarily an import path change to align with React Router 7 and reduce unnecessary abstraction layers.