# Hydrogen template: Infinite Scroll

This Hydrogen template demonstrates infinite scroll pagination for collection pages. Hydrogen is Shopify's stack for headless commerce, designed to work with [Remix](https://remix.run/), Shopify's full stack web framework.

This template shows how to implement a seamless browsing experience where products automatically load as users scroll down, replacing traditional pagination with continuous content loading.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- **Infinite scroll pagination**
- **Intersection Observer implementation**
- **Optimized image loading strategies**

## Infinite Scroll Features

### Automatic Loading
- Products load automatically when the "Load more" button enters the viewport
- No manual clicking required for pagination
- Smooth, uninterrupted browsing experience

### Performance Optimizations
- First 8 products load eagerly for instant display
- Subsequent products use lazy loading
- Images optimized with proper loading strategies
- Minimal JavaScript overhead using native Intersection Observer

### User Experience
- Preserves browser history and URL state
- Maintains scroll position during navigation
- Clean URL updates using replace mode
- No history cluttering from pagination

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Implementation Details

The infinite scroll implementation uses:
- React's `useEffect` hook for scroll detection
- Intersection Observer API for viewport detection
- Remix's navigation for URL updates
- Shopify's Pagination component as the base

### Key Components

```tsx
// Intersection Observer setup
useEffect(() => {
  if (!fetcher.data && !fetcher.state) {
    fetcher.load(nextPageUrl);
  }
}, [inView]);
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Customization

You can adjust the infinite scroll behavior by:
- Changing the threshold for when loading triggers
- Modifying the number of products loaded per batch
- Customizing the loading indicator
- Adding scroll-to-top functionality

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>