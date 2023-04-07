# Hydrogen template: Skeleton

This template seeds the `shopify hydrogen generate` command from the `hydrogen cli`.

Please be sure to read and follow the [template guidelines](./TEMPLATE_GUIDELINES.md) documentation.

## Supporting Remix v1 and v2 in the same route files

We should provide generators for both Remix v1 and v2 until we drop support for v1. Instead of duplicating files, the CLI can modify route files and adapt the syntax to the user app according to their Remix version. To use this feature, apply the following patterns when creating new skeleton routes.

### `v2_routeConvention`

Keep the skeleton template files using v1 convention. The CLI will change the routes in the user app to v2 if needed.

### `v2_meta`

In the same route file, include the following imports and exports:

```tsx
import {type MetaFunction} from '@shopify/remix-oxygen';
import {type V2_MetaFunction} from '@remix-run/react';

export const metaV1: MetaFunction = ({data}) => {
  const title = 'title';
  return {title};
};

export const meta: V2_MetaFunction = ({data}) => {
  const title = 'title';
  return [{title}];
};
```

Where:

- Each type import is prefixed with `type`.
- The type import for v2 comes from `@remix-run/react`, while v1 comes from `@shopify/remix-oxygen`.
- The v1 export must match `export function metaV1` or `export const metaV1` (use the latter for types).
- The v2 export must match `export function meta` or `export const meta` (use the latter for types).
- Do not add extra comments around the exports since they won't be removed.

### `v2_errorBoundary`

In the same route file, include the following imports and exports:

```tsx
import {useCatch, isRouteErrorResponse, useRouteError} from '@remix-run/react';
import {type ErrorBoundaryComponent} from '@shopify/remix-oxygen';

export function CatchBoundary() {
  const caught = useCatch();
  return <div>{caught.message}</div>;
}

export const ErrorBoundaryV1: ErrorBoundaryComponent = ({error}) => {
  return <div>There was an error: {error.message}</div>;
};

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <div>RouteError</div>;
  } else {
    return <h1>Unknown Error</h1>;
  }
}
```

Where:

- `useCatch`, `isRouteErrorResponse` and `useRouteError` imports are optional and will be removed accordingly.
- The import for `ErrorBoundaryComponent` type must be prefixed with `type`.
- The v1 export must match `export function ErrorBoundaryV1` or `export const ErrorBoundaryV1` (use the latter for types). Optionally, add a catch boundary that matches `export function CatchBoundary`.
- The v2 export must match `export function ErrorBoundary`. This one has no types.
- Do not add extra comments around the exports since they won't be removed.
