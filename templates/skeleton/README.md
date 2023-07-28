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

Scafold a new hydrogen store

```bash
h2 init
```

Find a new section in the UI registry

```
https://hydrogen-ui-e3f48eed66654f1e6bd3.o2.myshopify.dev
```

Copy the command to generate a new section

```
h2 generate section ImageText
```

Add a new section via the CLI. In the terminal paste your command:

```bash
HYDROGEN_UI_URL=https://hydrogen-ui-e3f48eed66654f1e6bd3.o2.myshopify.dev h2 generate section imagetext --path app
```

Start developing

```bash
HACK_ACCESS_TOKEN={insert-admin-api-token} h2 dev --codegen-unstable
```

Query for new section in `app/routes/hackdays.tsx`

```ts
// Step 1. Add imports
import {Sections, type RouteSections} from '../sections/Sections';
import {IMAGE_TEXT_QUERY} from '../sections/ImageText.schema';

// Step 2. Fetch your new metaobject section
const {section: imageText} = await context.storefront.query(IMAGE_TEXT_QUERY, {
  variables: {
    handle: 'h2_default_section_image_text',
  },
});
const sections = [imageText] as RouteSections;
return json({sections});

// Step 3. Render your new metaobject section
const {sections} = useLoaderData<typeof loader>();

return (
  <>
    <Sections sections={sections} />
  </>
);
```

## Premade `/hackdays/` route

```ts
import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {Sections, type RouteSections} from '../sections/Sections';
import {IMAGE_TEXT_QUERY} from '../sections/ImageText.schema';
import {HERO_QUERY} from '../sections/Hero.schema';

export async function loader({context}: LoaderArgs) {
  const {section: imageText} = await context.storefront.query(
    IMAGE_TEXT_QUERY,
    {
      variables: {
        handle: 'h2_default_section_image_text',
      },
    },
  );
  const {section: hero} = await context.storefront.query(HERO_QUERY, {
    variables: {
      handle: 'h2_default_section_hero',
    },
  });
  const sections = [imageText, hero] as RouteSections;
  return json({sections});
}

export default function Page() {
  const {sections} = useLoaderData<typeof loader>();

  return (
    <>
      <Sections sections={sections} />
    </>
  );
}
```
