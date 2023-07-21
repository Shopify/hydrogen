# Hydrogen Skeleton Template Guidelines

This initial document provides guidelines and opinionated best practices for developing in Remix and Hydrogen with the goal of building consistent and well structured code. This may evolve into more official recommendations, such as ESLint presets and other tooling to guide users to the outcomes defined below.

Topics covered:

- [Error Handling](#error-handling)
- [Template Dependencies](#template-dependencies)
- [Remix Route APIs](#remix-route-apis)
- [TypeScript](#typescript)
- [Remix Loader Return Values](#remix-loader-return-values)
- [GraphQL Query Definitions](#graphql-query-definitions)
- [Comment Styles](#comment-styles)

## Error Handling

Always demonstrate realistic error-handling. Skeleton templates should be a shining example of handling any sort of error that can occur. This will also help teach developers what kinds of errors could occur, where they occur, and how to handle them correctly.

### Do

- **Have an `ErrorBoundary` in every route template.** `ErrorBoundary` is used when an Error is thrown in a “loader”, and is generally meant for unexpected errors, like 500, 503, etc. Any Storefront query or mutation error will be handled by the `ErrorBoundary`. Type the error as “unknown” since _anything_ in JS can be thrown 🙂
- **Use the “errorElement” prop on every `<Await>` component.** When using “defer”, some promises may be rejected at a later time. The only way to handle this is to use the “errorElement” on the associated <Await> component, otherwise the error is swallowed.
- **Use try/catch** – except in “loader”, “action”, and the Component. Those three “Route Module APIs” are handled automatically by `ErrorBoundary` and CatchBoundary, but the rest – such as “meta”, “links”, “handle”, etc. – will crash the server if an error is thrown.
- **Have a CatchBoundary if necessary.** A CatchBoundary is used when a new Response is thrown, and is generally meant for expected errors caused by the user, such as 401, 404, etc. Note that `CatchBoundary`s will be deprecated in Remix V2, at which time we'll remove this recommendation.

### Don’t

- **Use try/catch in “loader”, “action”, and the Component.** For templates it’s easier to let the error be thrown and get handled by the `ErrorBoundary` than to handle it manually.

### Examples

PR: <https://github.com/Shopify/hydrogen/pull/716>

Code:

```tsx
export async function loader() {
  /* failed Storefront API requests will throw to the ErrorBoundary */
  const data = storefront.query()


  /* If no page data is returned purposely throw to the CatchBoundary */
  if (!data?.page) {
    throw new Response('Page not found', { status: 404 })
  }

  //...
  return defer()
}

export function meta() {
  try {
    //
  catch(error) {
    //
  }
}

export function ErrorBoundary({error}) {
  return (<div>{error.message}</div>)
}

// Note that `CatchBoundary`s will be deprecated in Remix V2
export function CatchBoundary() {
  const {statusText} = useCatch()
  return (<div>{statusText}</div>)
}

export default function TheUIComponents() {
  return (
    <Await resolve={} errorElement={<div>An error occurred</div>}>
      //
    </Await>
  )
}
```

## Template Dependencies

Minimalize dependencies and shared code between templates; template files are meant to stand alone in a given Hydrogen storefront.

### Do

- Keep all code associated with a template in a single template file, even if that means some duplication in templates

### Don't

- Share code between templates in a separate file. There is no guarantee that any given project will need both those templates, and we also want to avoid issues associated with generating multiple files (such as file organization).
- Use `npm` packages or dependencies in templates that aren't directly associated with Hydrogen or Remix. A package like `tiny-invariant` could be 1) confusing to developers unfamiliar with it, 2) abstract away things that we want to teach, such as correct error handling, and 3) require us to figure out how to correctly give direction on installation and updating the `package.json` upon template creation.

<!-- ## Code Organization

Maintain consistency in the styling of the code and the order that things are done within them. This helps developers jump between our templates and know where to look for certain things like `loaders`, etc. -->

<!-- ### Module and Type Imports

Route module imports should follow this proposed order (sorted alphabetically where applicable)

#### Example

```tsx
/* node_modules first */
import invariant from "tiny-invariant";
import { useState } from "react";

/* aliased second */
import { MyComponent } from "~/components";
import { atob, btoa, parser } from "~/lib";

/* local imports third */
import { myFunction } from "./myFunction";

/* type imports last */
import type { Shop } from "@shopify/hydrogen-react/storefront-api-types";
``` -->

## Remix Route APIs

Remix-specific route API functions should be ordered and consistent in style, to help developers quickly scan and find what they're looking for.

### Do

- Order these APIs following a top-down order of concerns:
  1. Http header tweaks (`shouldRevalidate`, `headers`, `meta`, `links`)
  1. Data manipulation (`loader`, `action`)
  1. UI (`Component`)
  1. Error handling (`ErrorBoundary`, `CatchBoundary`)
  1. Storefront API GraphQL query strings
- Use function declarations when possible
- Use the most specific type available for Remix Route APIs.

### Example

```tsx
/* module imports... */
import type {LoaderArgs, ActionArgs} from '@shopify/remix-oxygen';

/* local type defintions */

export async function handle() {}

export async function shouldRevalidate() {}

export async function headers() {}

export async function meta() {}

export async function links() {}

export async function loader({}: LoaderArgs) {}

export async function action({}: ActionArgs) {}

export default function Component() {}

export function ErrorBoundary() {}

export function CatchBoundary() {}

/* storefront Queries/Mutations, see more specific recommendations below  */
```

## TypeScript

Use the types generated automatically for the Storefront API. This not only demonstrates to devs what these types are and where they can be used, but also helps our repo automatically stay up-to-date with Storefront API changes. It also preserves the human-readable documentation that the Storefront API has on each Storefront object and property.

### Do

- Use the types from `'@shopify/hydrogen/storefront-api-types'`
- Use TypeScript utilities, such as `Pick`, `Omit`, etc. to format the type into the shape you need
- Use `type` over `interface` when possible
- Use `type` when importing types from packages

### Example

```ts
import type {Product} from '@shopify/hydrogen/storefront-api-types';
type MyCustomProduct = Pick<Product, 'name' | 'description'>;
```

## Remix Loader Return Values

Use the correct return type in `loader()`, `action()`, etc.

### Do

- Use `json()` by default
- Use `redirect()` from the `@shopify/remix-oxygen` package to redirect
- Use `defer()` when there is a need to have content streamed in later
- Use `new Response()` for errors (like 404s) and for unique document responses like `.xml` and `.txt`
- Use capitalized and kebab-cased headers in responses, like `Cache-Control`

### Example

```tsx
export async function loader() {
  return json({foo: 'bar'});
}
```

```tsx
import {redirect} from ''@shopify/remix-oxygen';';
export async function loader() {
  return redirect('/');
}
```

```tsx
export async function loader() {
  return json(
    {foo: 'bar'},
    {
      headers: {
        'Cache-Control': 'none',
      },
    },
  );
}
```

## Graphql Query Definitions

Be consistent in the query's variable name, in addition to the query's name in the query string. This helps the variables to be easily found, and ensure that tooling (like GraphQL Codegen) doesn't have conflicts in query types and results.

### Do

- Declare query and mutation constant names in SCREAMING_SNAKE_CASE
- Ensure that the query name itself is a (globally-unique) name based on the filename and the query contents
- Place the query at the bottom of the route template. See the [Remix Route APIs](#remix-route-apis) for more details

### Example

```tsx
// in '/product.tsx'
const QUERY_SHOP = `#graphql
  query product_shop {
    shop {
      ...
    }
  }
`;
```

```tsx
// in '/collection.tsx'
const MUTATION_ADD_TO_CART = `#graphql
  mutation collection_add_to_cart {
    ...
  }
`;
```

## Comment Styles

Use `//` for single-line comments, and `/** */` for multi-line comments. Consider adding a header section for additional context or extremely long comment blocks.

### Example

```tsx
// this is fine for single lines
function test() {}

/**
 * If you're providing substantial context, links, example code and other stuff,
 * then you should switch to something that really visually differentiates.
 */
function thing() {}

/**
 * myStuff
 * -----------------
 * Renders a login page for customer accounts.
 * And does other really cool stuff
 */
function myStuff() {}
```

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
