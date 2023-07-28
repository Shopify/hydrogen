# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 16.14.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Hackdays Demo

At `app/routes/_index.tsx`

```ts
// Step 1. Add imports
import {Sections, type RouteSections} from '../sections/Sections';
import {IMAGE_TEXT_QUERY} from '../sections/ImageText.schema';
import {useLoaderData} from '@remix-run/react';

// Step 2. Fetch your new metaobject section
const {section: imageText} = await context.storefront.query(IMAGE_TEXT_QUERY, {
  variables: {
    handle: 'section-image-text-example',
  },
});
const sections = [imageText] as RouteSections;
return json({sections});

// Step 3. Render your new metaobject section
const {sections} = useLoaderData<typeof loader>();
<Sections sections={sections} />;
```
