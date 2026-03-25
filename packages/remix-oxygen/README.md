# @shopify/remix-oxygen (Deprecated)

> **This package is deprecated.** All types and utilities it re-exports are available directly from [`react-router`](https://reactrouter.com). For `createRequestHandler` and `getStorefrontHeaders`, use [`@shopify/hydrogen/oxygen`](https://shopify.dev/docs/storefronts/headless/hydrogen) instead.

## Migration

Replace imports from `@shopify/remix-oxygen` as follows:

| Before                                                          | After                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| `import type {LoaderFunctionArgs} from '@shopify/remix-oxygen'` | `import type {LoaderFunctionArgs} from 'react-router'`          |
| `import {redirect} from '@shopify/remix-oxygen'`                | `import {redirect} from 'react-router'`                         |
| `import {createRequestHandler} from '@shopify/remix-oxygen'`    | `import {createRequestHandler} from '@shopify/hydrogen/oxygen'` |
| `import {getStorefrontHeaders} from '@shopify/remix-oxygen'`    | `import {getStorefrontHeaders} from '@shopify/hydrogen/oxygen'` |
