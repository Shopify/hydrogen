# Hydrogen example: infinite scroll collection page

This folder contains an example implementation of [infinite scroll](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#automatically-load-pages-on-scroll) within a product collection page using the [Pagination component](https://shopify.dev/docs/api/hydrogen/2024-07/components/pagination).

The example uses [`react-intersection-observer`](https://www.npmjs.com/package/react-intersection-observer) to detect when the `Load more` button is in view. A `useEffect` then triggers a navigation to the next page url, which seamlessly loads more products as the user scrolls.

A few side effects of this implementation are:

1. The page progressively enhances, so that when JavaScript has yet to load, the page is still interactive because the user can still click the `Load more` button.
2. As the user scrolls, the URL automatically changes as new pages are loaded.
3. Because the implementation uses the `Pagination` component, navigating back to the collection list after clicking on a product automatically maintains the user's scroll position.

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template infinite-scroll
```

## Dependencies

This example requires the `react-intersection-observer` package, which is automatically installed when you create a project with this template.

## Key files

This example modifies the collections page to add infinite scroll functionality.

| File                                                                       | Description                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`app/routes/collections.$handle.tsx`](app/routes/collections.$handle.tsx) | Modified collection page with infinite scroll using react-intersection-observer |

## Instructions

### 1. Link your store to inject the required environment variables

```bash
npx shopify hydrogen link
```

### 2. Edit the route loader

In `app/routes/collections.$handle.tsx`, update the `pageBy` parameter passed to the `getPaginationVariables` function call to customize how many products to load at a time.

```ts
const paginationVariables = getPaginationVariables(request, {
  pageBy: 8,
});
```
