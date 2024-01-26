# Hydrogen example: Metaobjects Content

This folder contains an example implementation of using [metaobjects](https://help.shopify.com/en/manual/custom-data/metaobjects)
as a thin Content Management System (CMS) for Hydrogen.

More specifically, this example focuses on how to render and manage custom content
at a route and section level.

## Requirements


- Basic understanding of metaobjects. Creating metaobject [definitions](https://help.shopify.com/en/manual/custom-data/metaobjects/building-a-metaobject),
creating metaobject [entries](https://help.shopify.com/en/manual/custom-data/metaobjects/creating-entries).
For more info, please refer to this [tutorial](https://help.shopify.com/en/manual/custom-data/metaobjects/using-metaobjects)
- Must use the "mock.shop" store because it has the required definitions and entries
to make this example work. To use this example in your own store please read the
[Implementing it in your store](#Implementing in your store) section below.


## Key files

This folder contains the minimal set of files needed to showcase the implementation.
Files that aren’t included by default with Hydrogen and that you’ll need to
create are labeled with 🆕.

| File                                                 | Description                               |
| ---------------------------------------------------- | ----------------------------------------- |
| 🆕 [`app/sections/RouteContent.tsx`](app/sections/RouteContent.tsx)  | A component that renders a route's content sections and an Edit button |
| 🆕 [`app/sections/Sections.tsx`](app/sections/Sections.tsx)  | A component that renders an array of content sections |
| 🆕 [`app/sections/SectionHero.tsx`](app/sections/SectionHero.tsx)  | A component that renders the SectionHero definition and entries  |
| 🆕 [`app/sections/SectionFeaturedProducts.tsx`](app/sections/SectionFeaturedProducts.tsx)  | A component that renders the SectionFeaturedProducts definition and entries  |
| 🆕 [`app/sections/SectionRichText.tsx`](app/sections/SectionRichText.tsx)  | A component that renders the SectionRichText definition and entries  |
| 🆕 [`app/sections/SectionStoreProfile.tsx`](app/sections/SectionStoreProfile.tsx)  | A component that renders the SectionStoreProfile definition and entries  |
| 🆕 [`app/sections/SectionStores.tsx`](app/sections/SectionStores.tsx)  | A component that renders the SectionStores definition and entries  |
| 🆕 [`app/components/EditRoute.tsx`](app/components/EditRoute.tsx)  | A component that overlays an Edit Route button in routes with metaobjects for easy access to the metaobject entry in the admin dashboard |
| 🆕 [`app/lib/parseSection.ts`](app/sections/parseSection.tsx)  | A utility that parses and cleans up SFAPI metaobject responses for easier consumption |
| 🆕 [`app/routes/stores._index.tsx`](app/routes/stores._index.tsx) | A route that displays a collection of custom store entries  |
| 🆕 [`app/routes/store.$.tsx`](app/routes/store.$.tsx) | A dynamic route that displays custom store metaobject profiles |
| [`app/routes/_index.tsx`](app/routes/_index.tsx) | Modified home route to display metaobjects route content / sections |

## Dependencies

| Module                                                                  | Description                             |
| ----------------------------------------------------------------------- | --------------------------------------- |
| 🆕 [`slate`](https://www.npmjs.com/package/slate)     | A customizable framework for building rich text editors |
| 🆕 [`slate-react`](https://www.npmjs.com/package/slate-react)   | Slate react components |

## Instructions

### 1. Link the mock.shop store to inject the required environment variables

Create or adjust the environment file `.env` at the root of the project

```
SESSION_SECRET="foobar"
PUBLIC_STORE_DOMAIN="mock.shop"
```

> [!NOTE]
> If you would like to use your store instead please ensure that the [required metaobjects](TODO)
structure has been created.

### 2. Copy over the 🆕 files

- utils/
- sections/
- components/
- routes/

### 3. Modify the homepage route

Import the `RouteContent` component and query

```ts
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';
```

Adjust the loader to query for the route metaobject content

```
export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;

  const {route} = await storefront.query(ROUTE_CONTENT_QUERY, {
    variables: {handle: 'route-home'},
    cache: storefront.CacheNone(),
  });

  return json({route});
}
```

Render the route's content sections with RouteContent

```
export default function Homepage() {
  const {route} = useLoaderData<typeof loader>();

  return (
    <div className="home">
      <RouteContent route={route} />
    </div>
  );
}
```

> [!NOTE]
> You can repeat this same process in any other route that should be capable of rendering
route content entries.

[View the complete component file](app/routes/_index.tsx) to see these updates in context.

---

### (Optional) Initialize a new project based on this example

```bash
h2 init --template metaobjects
```

Create an environment file `.env` at the root of the project

```
SESSION_SECRET="foobar"
PUBLIC_STORE_DOMAIN="mock.shop"
```

Run the project

```bash
npm run dev
```
