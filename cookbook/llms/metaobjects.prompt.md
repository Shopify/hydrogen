# Overview

This prompt describes how to implement "Dynamic content with metaobjects" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Build a flexible CMS using Shopify metaobjects for dynamic content sections

# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the metaobjects recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe creates a content management system using Shopify metaobjects.
It lets you create and manage dynamic content sections through your Shopify admin,
providing a flexible way to build pages with reusable components.

Key features:
- Dynamic route-based content rendering
- Modular section components (Hero, Featured Products, Featured Collections, Stores)
- Content editing capabilities with direct links to Shopify admin
- Rich text support with Slate editor
- Comprehensive documentation with visual guides

This recipe includes example section components that can be customized or extended
to match your specific content needs. See the included `guides/metaobjects/README.md` file for detailed setup instructions.

## Notes

> [!NOTE]
> You need to create the metaobject definitions in your Shopify admin before using this recipe. Each section component has a one-to-one relationship with a metaobject definition.

## Requirements

- Basic understanding of Shopify metaobjects
- Shopify store with metaobjects enabled (Shopify Plus or development store)
- Metaobject definitions created in your Shopify admin
- Environment variable: PUBLIC_STORE_DOMAIN (your store's admin domain)

## New files added to the template by this recipe

- app/components/EditRoute.tsx
- app/routes/stores.$name.tsx
- app/routes/stores._index.tsx
- app/sections/RouteContent.tsx
- app/sections/SectionFeaturedCollections.tsx
- app/sections/SectionFeaturedProducts.tsx
- app/sections/SectionHero.tsx
- app/sections/SectionStoreProfile.tsx
- app/sections/SectionStores.tsx
- app/sections/Sections.tsx
- app/utils/parseSection.ts
- guides/metaobjects/README.md
- guides/metaobjects/images/definition_link.png
- guides/metaobjects/images/definition_section_featured_collections.png
- guides/metaobjects/images/definition_section_featured_products.png
- guides/metaobjects/images/definition_section_hero.png
- guides/metaobjects/images/definition_section_rich_text.png
- guides/metaobjects/images/definition_section_store_profile.png
- guides/metaobjects/images/definition_section_stores_grid.png
- guides/metaobjects/images/definition_store.png
- guides/metaobjects/images/definitions_list.png
- guides/metaobjects/images/definiton_route.png

## Steps

### Step 1: Document the metaobjects CMS

Update the README file with metaobjects CMS documentation and an architecture overview.

#### File: /README.md

~~~diff
@@ -1,6 +1,8 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Metaobjects as CMS
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This Hydrogen template demonstrates how to use Shopify Metaobjects as a content management system (CMS). Hydrogen is Shopify's stack for headless commerce, designed to work with [Remix](https://remix.run/), Shopify's full stack web framework.
+
+This template shows how to create a flexible, section-based content architecture using Shopify's native Metaobjects, allowing merchants to manage content directly from the Shopify admin without external CMS dependencies.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -16,18 +18,60 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - Prettier
 - GraphQL generator
 - TypeScript and JavaScript flavors
-- Minimal setup of components and routes
+- **Metaobjects-based CMS architecture**
+- **Dynamic section rendering system**
+- **Content management through Shopify admin**
+
+## Metaobjects Architecture
+
+This template implements a hierarchical content structure:
+
+```
+Route (Metaobject)
+  └── Sections (References)
+      ├── SectionHero
+      ├── SectionFeaturedProducts
+      ├── SectionFeaturedCollections
+      ├── SectionStoreProfile
+      └── SectionStoreGrid
+```
+
+### Key Features
+
+- **Route-based content**: Each route can have its own set of sections
+- **Reusable sections**: Create once, use across multiple routes
+- **Type-safe**: Full TypeScript support with generated types
+- **Merchant-friendly**: Content managed directly in Shopify admin
+- **Extensible**: Easy to add new section types
 
 ## Getting started
 
 **Requirements:**
 
 - Node.js version 18.0.0 or higher
+- Shopify store with Metaobjects enabled
+- Metaobject definitions created in Shopify admin
 
 ```bash
 npm create @shopify/hydrogen@latest
 ```
 
+## Setting up Metaobjects
+
+1. **Create Metaobject definitions** in your Shopify admin:
+   - Navigate to Settings → Custom data → Metaobjects
+   - Create definitions for Route, SectionHero, SectionFeaturedProducts, etc.
+   - See `guides/metaobjects/README.md` for detailed field configurations
+
+2. **Create content entries**:
+   - Add Route entries for pages you want to manage
+   - Create Section entries and link them to Routes
+   - Configure section content and references
+
+3. **Query and render**:
+   - Routes automatically query their associated sections
+   - Sections component handles dynamic rendering based on type
+
 ## Building for production
 
 ```bash
@@ -40,6 +84,21 @@ npm run build
 npm run dev
 ```
 
+## Creating New Sections
+
+1. Define the Metaobject in Shopify admin
+2. Create a React component in `app/sections/`
+3. Add the GraphQL fragment for querying
+4. Register in the Sections component switch statement
+
+Example:
+```tsx
+export function SectionExample(props: SectionExampleFragment) {
+  const section = parseSection<...>(props);
+  return <section>...</section>;
+}
+```
+
 ## Setup for using Customer Account API (`/account` section)
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
\ No newline at end of file
~~~

### Step 2: Add product fragment for sections

Add RECOMMENDED_PRODUCT_FRAGMENT for displaying product collections in metaobject sections.

#### File: /app/lib/fragments.ts

~~~diff
@@ -232,3 +232,25 @@ export const FOOTER_QUERY = `#graphql
   }
   ${MENU_FRAGMENT}
 ` as const;
+
+// @description Fragment for recommended products needed by ProductItem component
+export const RECOMMENDED_PRODUCT_FRAGMENT = `#graphql
+  fragment RecommendedProduct on Product {
+    id
+    title
+    handle
+    priceRange {
+      minVariantPrice {
+        amount
+        currencyCode
+      }
+    }
+    featuredImage {
+      id
+      url
+      altText
+      width
+      height
+    }
+  }
+` as const;
~~~

### Step 3: Create edit route component

Add the edit route component for managing metaobject-based content in development.

#### File: [EditRoute.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/components/EditRoute.tsx)

~~~tsx
import {useState, useEffect} from 'react';
import {Link, useMatches} from 'react-router';

/**
 * Displays an `Edit Route` button in the top right corner of the page
 * This button opens a new tab that let's you easily edit the metaobject entry in the Shopify Admin
 * This is only display when in development or when in preview branch deployment
 */
export function EditRoute({routeId}: {routeId: string}) {
  const [url, setUrl] = useState<URL | null>(null);
  const [root] = useMatches();
  // @ts-expect-error data might not have publicStoreSubdomain
  const publicStoreSubdomain = root?.data?.publicStoreSubdomain;

  useEffect(() => {
    setUrl(new URL(window.location.href));
  }, []);

  if (!url || !publicStoreSubdomain) return null;

  const isDev =
    url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1');
  const isPreview = url.hostname.includes('preview');
  const legacyId = routeId.split('/').pop();
  const adminEditUrl = `https://admin.shopify.com/store/${publicStoreSubdomain}/content/entries/route/${legacyId}`;

  const shouldShowEditLink = isDev || isPreview;
  if (!shouldShowEditLink) return null;

  return (
    <Link
      to={adminEditUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        position: 'absolute',
        top: '5rem',
        right: '3rem',
        padding: '0.5rem',
        backgroundColor: 'black',
        color: 'white',
        zIndex: 100,
      }}
    >
      Edit Route
    </Link>
  );
}

~~~

### Step 4: Expose store subdomain

Expose the public store subdomain for metaobject queries and content management.

#### File: /app/root.tsx

~~~diff
@@ -90,6 +90,8 @@ export async function loader(args: Route.LoaderArgs) {
       country: args.context.storefront.i18n.country,
       language: args.context.storefront.i18n.language,
     },
+    // @description Add public store subdomain for metaobjects
+    publictoreSubdomain: args.context.env.PUBLIC_STORE_DOMAIN,
   };
 }
~~~

### Step 5: Build store profile route

Add a dynamic store profile route for displaying store-specific metaobject content.

#### File: [stores.$name.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/routes/stores.$name.tsx)

~~~tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/stores.$name';

// 1. Add metaobject content imports
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params}: Route.LoaderArgs) {
  const {storefront} = context;
  const {name} = params;
  
  // 2. Query for the route's content metaobject
  const [{route}] = await Promise.all([
    storefront.query(ROUTE_CONTENT_QUERY, {
      variables: {handle: `route-${name}`},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {route};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  // No deferred data for this route
  return {};
}

export default function Store() {
  const {route} = useLoaderData<typeof loader>();
  return (
    <div className="store">
      {/* 3. Render the route's content sections */}
      <RouteContent route={route} />
    </div>
  );
}

~~~

### Step 6: Add metaobjects to homepage

Integrate the `RouteContent` component to render metaobject sections on the homepage.

#### File: /app/routes/_index.tsx

~~~diff
@@ -1,19 +1,11 @@
-import {
-  Await,
-  useLoaderData,
-  Link,
-} from 'react-router';
+import {useLoaderData} from 'react-router';
 import type {Route} from './+types/_index';
-import {Suspense} from 'react';
-import {Image} from '@shopify/hydrogen';
-import type {
-  FeaturedCollectionFragment,
-  RecommendedProductsQuery,
-} from 'storefrontapi.generated';
-import {ProductItem} from '~/components/ProductItem';
+
+// @description Add metaobject content imports
+import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';
 
 export const meta: Route.MetaFunction = () => {
-  return [{title: 'Hydrogen | Home'}];
+  return [{title: 'Hydrogen Metaobject | Home'}];
 };
 
 export async function loader(args: Route.LoaderArgs) {
@@ -31,14 +23,18 @@ export async function loader(args: Route.LoaderArgs) {
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
 async function loadCriticalData({context}: Route.LoaderArgs) {
-  const [{collections}] = await Promise.all([
-    context.storefront.query(FEATURED_COLLECTION_QUERY),
+  const {storefront} = context;
+
+  // @description Query the home route metaobject
+  const [{route}] = await Promise.all([
+    storefront.query(ROUTE_CONTENT_QUERY, {
+      variables: {handle: 'route-home'},
+      cache: storefront.CacheNone(),
+    }),
     // Add other queries here, so that they are loaded in parallel
   ]);
 
-  return {
-    featuredCollection: collections.nodes[0],
-  };
+  return {route};
 }
 
 /**
@@ -47,125 +43,17 @@ async function loadCriticalData({context}: Route.LoaderArgs) {
  * Make sure to not throw any errors here, as it will cause the page to 500.
  */
 function loadDeferredData({context}: Route.LoaderArgs) {
-  const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
-    .catch((error: Error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-
-  return {
-    recommendedProducts,
-  };
+  // No deferred data for this route
+  return {};
 }
 
 export default function Homepage() {
-  const data = useLoaderData<typeof loader>();
+  const {route} = useLoaderData<typeof loader>();
+
   return (
     <div className="home">
-      <FeaturedCollection collection={data.featuredCollection} />
-      <RecommendedProducts products={data.recommendedProducts} />
+      {/* @description Render the route's content sections */}
+      <RouteContent route={route} />
     </div>
   );
 }
-
-function FeaturedCollection({
-  collection,
-}: {
-  collection: FeaturedCollectionFragment;
-}) {
-  if (!collection) return null;
-  const image = collection?.image;
-  return (
-    <Link
-      className="featured-collection"
-      to={`/collections/${collection.handle}`}
-    >
-      {image && (
-        <div className="featured-collection-image">
-          <Image data={image} sizes="100vw" />
-        </div>
-      )}
-      <h1>{collection.title}</h1>
-    </Link>
-  );
-}
-
-function RecommendedProducts({
-  products,
-}: {
-  products: Promise<RecommendedProductsQuery | null>;
-}) {
-  return (
-    <div className="recommended-products">
-      <h2>Recommended Products</h2>
-      <Suspense fallback={<div>Loading...</div>}>
-        <Await resolve={products}>
-          {(response) => (
-            <div className="recommended-products-grid">
-              {response
-                ? response.products.nodes.map((product) => (
-                    <ProductItem key={product.id} product={product} />
-                  ))
-                : null}
-            </div>
-          )}
-        </Await>
-      </Suspense>
-      <br />
-    </div>
-  );
-}
-
-const FEATURED_COLLECTION_QUERY = `#graphql
-  fragment FeaturedCollection on Collection {
-    id
-    title
-    image {
-      id
-      url
-      altText
-      width
-      height
-    }
-    handle
-  }
-  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...FeaturedCollection
-      }
-    }
-  }
-` as const;
-
-const RECOMMENDED_PRODUCTS_QUERY = `#graphql
-  fragment RecommendedProduct on Product {
-    id
-    title
-    handle
-    priceRange {
-      minVariantPrice {
-        amount
-        currencyCode
-      }
-    }
-    featuredImage {
-      id
-      url
-      altText
-      width
-      height
-    }
-  }
-  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...RecommendedProduct
-      }
-    }
-  }
-` as const;
~~~

### Step 7: Display all stores

Add a store listing page that shows all stores from metaobjects with a grid layout.

#### File: [stores._index.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/routes/stores._index.tsx)

~~~tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/stores._index';

// 1. Add metaobject content imports
import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  // 2. Query for the route's content metaobject
  const [{route}] = await Promise.all([
    storefront.query(ROUTE_CONTENT_QUERY, {
      variables: {handle: 'route-stores'},
      cache: storefront.CacheNone(),
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {route};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  // No deferred data for this route
  return {};
}

export default function Stores() {
  const {route} = useLoaderData<typeof loader>();

  return (
    <div className="stores">
      {/* 3. Render the route's content sections */}
      <RouteContent route={route} />
    </div>
  );
}

~~~

### Step 8: Install rich text dependencies

Add Slate dependencies for rich text editing in metaobject sections.

#### File: /package.json

~~~diff
@@ -21,7 +21,9 @@
     "react": "18.3.1",
     "react-dom": "18.3.1",
     "react-router": "7.9.2",
-    "react-router-dom": "7.9.2"
+    "react-router-dom": "7.9.2",
+    "slate": "^0.101.4",
+    "slate-react": "^0.101.3"
   },
   "devDependencies": {
     "@eslint/compat": "^1.2.5",
~~~

### Step 9: Create route content component

Add the main component for fetching and rendering metaobject-based route content.

#### File: [RouteContent.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/RouteContent.tsx)

~~~tsx
import {SECTIONS_FRAGMENT, Sections} from '~/sections/Sections';
import {EditRoute} from '~/components/EditRoute';

import type {RouteContentQuery} from 'storefrontapi.generated';

export function RouteContent({route}: {route: RouteContentQuery['route']}) {
  if (!route?.sections) {
    return <p>No route content sections</p>;
  }

  return (
    <div>
      {route?.id && <EditRoute routeId={route.id} />}
      {route?.sections && <Sections sections={route.sections} />}
    </div>
  );
}

export const ROUTE_CONTENT_QUERY = `#graphql
  query RouteContent($handle: String!) {
    route: metaobject(handle: {type: "route", handle: $handle}) {
      type
      id
      title: field(key: "title") {
        key
        value
      }
      sections: field(key: "sections") {
        ...Sections
      }
    }
  }
  ${SECTIONS_FRAGMENT}
`;

~~~

### Step 10: Build featured collections section

Add a section component for displaying featured product collections from metaobjects.

#### File: [SectionFeaturedCollections.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/SectionFeaturedCollections.tsx)

~~~tsx
import type {
  SectionFeaturedCollectionsFragment,
  FeaturedCollectionImageFragment,
} from 'storefrontapi.generated';
import {parseSection} from '~/utils/parseSection';
import type {ParsedMetafields} from '@shopify/hydrogen';
import {Image} from '@shopify/hydrogen';

export function SectionFeaturedCollections(
  props: SectionFeaturedCollectionsFragment,
) {
  const section = parseSection<
    SectionFeaturedCollectionsFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {id, heading, collections} = section;
  return (
    <section className="featured-collection" key={id}>
      {heading && <h2>{heading.parsedValue}</h2>}
      {collections?.nodes && (
        <ul className="recommended-products-grid">
          {collections.nodes.map((collection) => (
            <li key={collection.id}>
              <a href={`/collections/${collection.handle}`}>
                <Image
                  style={{height: 'auto', width: 400}}
                  aspectRatio="1/1"
                  data={collection.image as FeaturedCollectionImageFragment}
                />
                <h5>{collection.title}</h5>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const FEATURED_COLLECTION_FRAGMENT = `#graphql
  fragment FeaturedCollectionImage on Image {
    altText
    width
    height
    url
  }

  fragment FeaturedCollection on Collection {
    id
    title
    handle
    image {
      ...FeaturedCollectionImage
    }
  }
`;

export const SECTION_FEATURED_COLLECTIONS_FRAGMENT = `#graphql
  fragment SectionFeaturedCollectionsField on MetaobjectField {
    type
    key
    value
  }
  fragment SectionFeaturedCollections on Metaobject {
    type
    id
    heading: field(key: "heading") {
      ...SectionFeaturedCollectionsField
    }
    collections: field(key: "collections") {
      references(first: 10) {
        nodes {
          ... on Collection {
            ...FeaturedCollection
          }
        }
      }
    }
    withCollectionTitles: field(key: "with_collection_titles") {
     ...SectionFeaturedCollectionsField
    }
  }
  ${FEATURED_COLLECTION_FRAGMENT}
`;

~~~

### Step 11: Build featured products section

Add a section component for showcasing featured products with a customizable layout.

#### File: [SectionFeaturedProducts.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/SectionFeaturedProducts.tsx)

~~~tsx
import {Money, Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {SectionFeaturedProductsFragment} from 'storefrontapi.generated';

export function SectionFeaturedProducts(
  props: SectionFeaturedProductsFragment,
) {
  const {heading, body, products, withProductPrices} = props;
  return (
    <section>
      {heading && <h2>{heading.value}</h2>}
      {body && <p>{body.value}</p>}
      {products?.references?.nodes && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridGap: '1rem',
            paddingTop: '1rem',
          }}
        >
          {products.references.nodes.map((product) => {
            const {variants, priceRange, title} = product;
            const variant = variants?.nodes?.[0];
            return (
              <Link
                key={product.id}
                to={`/products/${product.handle}`}
                prefetch="intent"
              >
                {variant.image && (
                  <Image data={variant.image} style={{width: 'auto'}} />
                )}
                <h5 style={{marginBottom: '.5rem'}}>{title}</h5>
                {withProductPrices && (
                  <small style={{display: 'flex', marginTop: '.5rem'}}>
                    <span>From</span> &nbsp;
                    <Money data={priceRange.minVariantPrice} />
                  </small>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

const FEATURED_PRODUCT_FRAGMENT = `#graphql
  fragment FeaturedProduct on Product {
    id
    title
    handle
    productType
    variants(first: 1) {
      nodes {
        title
        image {
          altText
          width
          height
          url
        }
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

export const SECTION_FEATURED_PRODUCTS_FRAGMENT = `#graphql
  fragment SectionFeaturedProducts on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    body: field(key: "body") {
      key
      value
    }
    products: field(key: "products") {
      key
      references(first: 10) {
        nodes {
          ... on Product {
            ...FeaturedProduct
          }
        }
      }
    }
    withProductPrices: field(key: "with_product_prices") {
      key
      value
    }
  }
  ${FEATURED_PRODUCT_FRAGMENT}
`;

~~~

### Step 12: Build hero banner section

Add a hero banner section with an image, heading, and call-to-action from metaobjects.

#### File: [SectionHero.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/SectionHero.tsx)

~~~tsx
import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from 'react-router';
import type {SectionHeroFragment} from 'storefrontapi.generated';

export function SectionHero(props: SectionHeroFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {image, heading, subheading, link} = section;

  const backgroundImage = image?.image?.url
    ? `url("${image.image.url}")`
    : undefined;

  return (
    <section
      className="section-hero"
      style={{
        backgroundImage,
        height: '50%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        position: 'relative',
        minHeight: '500px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '2rem',
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {heading && <h1 style={{marginBottom: 0}}>{heading.parsedValue}</h1>}
        {subheading && <p>{subheading.value}</p>}
        {link?.href?.value && (
          <Link
            to={link.href.value}
            style={{
              textDecoration: 'underline',
              marginTop: '1rem',
            }}
            {...(link?.target?.value !== 'false'
              ? {target: '_blank', rel: 'noreferrer'}
              : {})}
          >
            {link?.text?.value}
          </Link>
        )}
      </div>
    </section>
  );
}

const MEDIA_IMAGE_FRAGMENT = `#graphql
  fragment MediaImage on MediaImage {
    image {
      altText
      url
      width
      height
    }
  }
`;

const LINK_FRAGMENT = `#graphql
  fragment Link on MetaobjectField {
    ... on MetaobjectField {
      reference {
        ...on Metaobject {
          href: field(key: "href") {
            value
          }
          target: field(key: "target") {
            value
          }
          text: field(key: "text") {
            value
          }
        }
      }
    }
  }
`;

export const SECTION_HERO_FRAGMENT = `#graphql
  fragment SectionHero on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    subheading: field(key: "subheading") {
      key
      value
    }
    link: field(key: "link") {
      ...Link
    }
    image: field(key: "image") {
      key
      reference {
        ... on MediaImage {
          ...MediaImage
        }
      }
    }
  }
  ${LINK_FRAGMENT}
  ${MEDIA_IMAGE_FRAGMENT}
`;

~~~

### Step 13: Build store profile section

Add a store profile section that displays store details, hours, and contact information.

#### File: [SectionStoreProfile.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/SectionStoreProfile.tsx)

~~~tsx
import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from 'react-router';
import type {SectionStoreProfileFragment} from 'storefrontapi.generated';
import type {Key, ReactElement, JSXElementConstructor, ReactNode} from 'react';

export function SectionStoreProfile(props: SectionStoreProfileFragment) {
  const section = parseSection<
    SectionStoreProfileFragment,
    // override metafields types that have been parsed
    {
      store: {
        hours?: ParsedMetafields['list.single_line_text_field'];
      };
    }
  >(props);

  const {image, heading, description, hours, address} = section.store;

  return (
    <section id={props.id} className="store">
      <Link to={`/stores`}>Back to Stores</Link>
      <div>
        <br />
        {image?.image?.url && (
          <img
            width={800}
            src={image.image.url}
            alt={image?.image?.altText || ''}
          />
        )}
      </div>
      {heading && <h1>{heading.value}</h1>}
      {description && <p>{description.value}</p>}
      <br />
      <div>
        <h5>Address</h5>
        {address && <address>{address.value}</address>}
      </div>
      {hours?.parsedValue && (
        <div>
          <br />
          <h5>Opening Hours</h5>
          {hours.parsedValue.map((day: string) => (
            <p key={day}>{day}</p>
          ))}
        </div>
      )}
    </section>
  );
}

export const STORE_PROFILE_FRAGMENT = `#graphql
  fragment StoreProfileField on MetaobjectField {
    type
    key
    value
  }

  fragment StoreProfile on Metaobject {
    type
    id
    handle
    title: field(key: "title") {
      ...StoreProfileField
    }
    heading: field(key: "heading") {
      ...StoreProfileField
    }
    description: field(key: "description") {
      ...StoreProfileField
    }
    address: field(key: "address") {
      ...StoreProfileField
    }
    hours: field(key: "hours") {
      ...StoreProfileField
    }
    image: field(key: "image") {
      type
      key
      reference {
        ... on MediaImage {
          image {
            altText
            url
            width
            height
          }
        }
      }
    }
  }
`;

export const SECTION_STORE_PROFILE_FRAGMENT = `#graphql
  fragment SectionStoreProfile on Metaobject {
    type
    id
    handle
    store: field(key: "store") {
       reference {
          ...on Metaobject {
            ...StoreProfile
          }
       }
    }
  }
  ${STORE_PROFILE_FRAGMENT}
`;

~~~

### Step 14: Build stores grid section

Add a grid layout section for displaying multiple store locations from metaobjects.

#### File: [SectionStores.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/SectionStores.tsx)

~~~tsx
import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseSection} from '~/utils/parseSection';
import {Link} from 'react-router';
import type {SectionStoresFragment} from 'storefrontapi.generated';

export function SectionStores(props: SectionStoresFragment) {
  const section = parseSection<
    SectionStoresFragment,
    // override metafields types that have been parsed
    {
      heading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {heading, stores} = section;

  return (
    <section className="section-stores">
      {heading?.value && <h1>{heading.value}</h1>}
      <div
        className="stores"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gridGap: '1rem',
        }}
      >
        {stores &&
          stores.nodes.map((store) => {
            if (!store) {
              return null;
            }
            const {image, heading, address} = store;
            return (
              <Link key={store.id} to={`/stores/${store.handle}`}>
                {image?.image?.url && (
                  <img
                    width={400}
                    src={image.image.url}
                    alt={image.image.altText || ''}
                  />
                )}
                {heading && (
                  <h2 style={{marginBottom: '.25rem', marginTop: '1rem'}}>
                    {heading.value}
                  </h2>
                )}
                {address && <address>{address?.value}</address>}
              </Link>
            );
          })}
      </div>
    </section>
  );
}

const STORE_ITEM_FRAGMENT = `#graphql
  fragment StoreItemField on MetaobjectField {
    type
    key
    value
  }
  fragment StoreItemImage on MediaImage {
    image {
      altText
      url(transform: {maxWidth: 600, maxHeight: 600})
      width
      height
    }
  }

  fragment StoreItem on Metaobject {
    type
    id
    handle
    heading: field(key: "heading") {
      ...StoreItemField
    }
    address: field(key: "address") {
      ...StoreItemField
    }
    image: field(key: "image") {
      key
      reference {
        ... on MediaImage {
          ...StoreItemImage
        }
      }
    }
}
`;

export const SECTION_STORES_FRAGMENT = `#graphql
  fragment SectionStores on Metaobject {
    type
    heading: field(key: "heading") {
      ...StoreItemField
    }
    stores: field(key: "stores") {
      references(first: 10) {
        nodes {
          ...StoreItem
        }
      }
    }
  }
  ${STORE_ITEM_FRAGMENT} `;

~~~

### Step 15: Create section renderer

Add a dynamic section renderer that maps metaobject types to React components.

#### File: [Sections.tsx](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/sections/Sections.tsx)

~~~tsx
import {SECTION_HERO_FRAGMENT, SectionHero} from '~/sections/SectionHero';
import {
  SECTION_FEATURED_PRODUCTS_FRAGMENT,
  SectionFeaturedProducts,
} from '~/sections/SectionFeaturedProducts';
import {
  SECTION_FEATURED_COLLECTIONS_FRAGMENT,
  SectionFeaturedCollections,
} from '~/sections/SectionFeaturedCollections';
import {SECTION_STORES_FRAGMENT, SectionStores} from '~/sections/SectionStores';
import {
  SECTION_STORE_PROFILE_FRAGMENT,
  SectionStoreProfile,
} from '~/sections/SectionStoreProfile';

import type {SectionsFragment} from 'storefrontapi.generated';

export function Sections({sections}: {sections: SectionsFragment}) {
  return (
    <div className="sections">
      {sections?.references?.nodes.map((section) => {
        switch (section.type) {
          case 'section_hero':
            return <SectionHero {...section} key={section.id} />;
          case 'section_featured_products':
            return <SectionFeaturedProducts {...section} key={section.id} />;
          case 'section_featured_collections':
            return <SectionFeaturedCollections {...section} key={section.id} />;
          case 'section_stores_grid':
            return <SectionStores {...section} key={section.id} />;
          case 'section_store_profile':
            return <SectionStoreProfile {...section} key={section.id} />;
          // case 'section_another':
          //   return <AnotherSection />;
          default:
            // eslint-disable-next-line no-console
            console.log(`Unsupported section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}

export const SECTIONS_FRAGMENT = `#graphql
  fragment Sections on MetaobjectField {
    ... on MetaobjectField {
      references(first: 10) {
        nodes {
          ... on Metaobject {
            id
            type
            ...SectionHero
            ...SectionFeaturedProducts
            ...SectionFeaturedCollections
            ...SectionStores
            ...SectionStoreProfile
          }
        }
      }
    }
  }
  # All section fragments
  ${SECTION_HERO_FRAGMENT}
  ${SECTION_FEATURED_PRODUCTS_FRAGMENT}
  ${SECTION_FEATURED_COLLECTIONS_FRAGMENT}
  ${SECTION_STORES_FRAGMENT}
  ${SECTION_STORE_PROFILE_FRAGMENT}
`;

~~~

### Step 16: Add section parsing utility

Add a utility function for parsing and transforming metaobject field data.

#### File: [parseSection.ts](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/app/utils/parseSection.ts)

~~~ts
import type {ParsedMetafields} from '@shopify/hydrogen';
import {parseMetafield} from '@shopify/hydrogen';

/**
 * Recursively parse metafields (objects containing a type, value and key)
 * into a more usable format. Removes nested reference and references keys.
 */
export function parseSection<InputType, ReturnType>(_section: InputType) {
  const section = liftEach(_section, [
    'reference',
    'references',
    // 'nodes',
  ] as const);
  const parsed = {} as Record<string, unknown>;

  // parse each key in the section
  for (const key in section) {
    const node = section[key];
    if (typeof node === 'object') {
      // @ts-expect-error node might not have type and value properties
      const isMetafield = node?.type && node?.value;
      const isArray = Array.isArray(node);
      if (isArray) {
        // Break the recursion for TypeScript 5.9+ by treating as unknown[]
        parsed[key] = (node as unknown[]).map((item) => parseSection(item));
      } else if (isMetafield) {
        parsed[key] = parseMetafieldValue(node);
      } else if (node && Object.keys(node as object).length > 0) {
        parsed[key] = parseSection(node as unknown);
      } else {
        delete parsed[key];
      }
    } else {
      parsed[key] = node;
    }
  }
  return parsed as unknown as typeof section & ReturnType;
}

function parseMetafieldValue(node: Record<string, any>) {
  let parsed;

  switch (node?.type) {
    case 'single_line_text_field':
      return parseMetafield<ParsedMetafields['single_line_text_field']>(node);

    case 'multi_line_text_field':
      return parseMetafield<ParsedMetafields['multi_line_text_field']>(node);

    case 'list.single_line_text_field':
      return parseMetafield<ParsedMetafields['list.single_line_text_field']>(
        node,
      );

    case 'list.collection_reference':
      return parseMetafield<ParsedMetafields['list.collection_reference']>(
        node,
      );

    // NOTE: expand with other field types as needed for your project
    default:
      parsed = node;
  }

  return parsed;
}

type LiftOtherKeys<KeyToLift, Section> = KeyToLift extends keyof Section
  ? Lift<Section[KeyToLift], KeyToLift>
  : object;

type Lift<Section, KeyToLift> = Section extends object
  ? Section extends Array<infer Item>
    ? Lift<Item, KeyToLift>[]
    : {
        [P in Exclude<keyof Section, KeyToLift>]: P extends 'value'
          ? NonNullable<Lift<Section[P], KeyToLift>> | undefined
          : Lift<Section[P], KeyToLift>;
      } & LiftOtherKeys<KeyToLift, Section>
  : Section;

type LiftEach<Section, KeysToLift> = KeysToLift extends readonly [
  infer FirstKeyToLift,
  ...infer RemainingKeysToLift,
]
  ? LiftEach<Lift<Section, FirstKeyToLift>, RemainingKeysToLift>
  : Section;

/**
 * Lifts a key from an object, and returns a new object with the key removed.
 */
function lift<Section, KeyToRemove extends PropertyKey>(
  value: Section,
  key: KeyToRemove,
): Lift<Section, KeyToRemove> {
  const isArray = Array.isArray(value);

  function liftObject(value: any) {
    const entries = Object.entries(value)
      .filter(([prop]) => prop !== key)
      .map(([prop, val]) => {
        const liftedVal = lift(val, key);
        return [prop, liftedVal];
      });
    const target = Object.fromEntries(entries);
    const source = key in value ? lift((value as any)[key], key) : {};
    const lifted = Array.isArray(source)
      ? source
      : Object.assign(target, source);
    return lifted;
  }

  return (
    value && typeof value === 'object'
      ? isArray
        ? value.map((item) => liftObject(item))
        : liftObject(value)
      : value
  ) as Lift<Section, KeyToRemove>;
}

/**
 * Lifts each key in an array from an object, and returns a new object with the keys removed.
 */
function liftEach<Section, KeysToRemove extends ReadonlyArray<PropertyKey>>(
  obj: Section,
  keys: KeysToRemove,
): LiftEach<Section, KeysToRemove> {
  return keys.reduce<object | Section>((result, keyToLift) => {
    return lift(result, keyToLift);
  }, obj) as LiftEach<Section, KeysToRemove>;
}

~~~

### Step 17: Add setup guide

A comprehensive guide for setting up metaobject definitions in the Shopify admin.

#### File: [README.md](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/README.md)

~~~md
# Metaobjects Overview

This document describes the high-level content architecture and metaobject definitions
to create a basic content management system (CMS) based on metaobjects.

## 1. Content Architecture

```bash
Metaobject Definitions
┌─────────────────────────────────────────────────┐
│                                                 │
│   Route                                         │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │                                         │   │
│   │ Sections                                │   │
│   │                                         │   │
│   │ ┌─────────────────────────────────────┐ │   │
│   │ │ SectionHero                         │ │   │
│   │ ├─────────────────────────────────────┤ │   │
│   │ │ SectionFeaturedProducts             │ │   │
│   │ └─────────────────────────────────────┘ │   │
│   │  ...                                    │   │
│   │                                         │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 2. Metaobject Definitions

The following is the list of metaojects that are used in this example:

![Metaobject definitions list](./images/definitions_list.png 'Metaobject Definitions List')

### Route Definition

A route is a container metaobject that holds one or many `Section` metaobject entries
you wish to render in a given Hydrogen route.

#### Route fields

![Route Definition](./images/definiton_route.png 'Metaobject Route Definition')

### SectionHero Definition

This definition includes a basic set of fields to render a typical Hero section.

### SectionHero fields

![SectionHero Definition](./images/definition_section_hero.png 'Metaobject SectionHero Definition')

### SectionFeaturedProducts Definition

This definition includes a basic set of fields to render a typical grid of products
that a merchant can curate via the admin.

#### SectionFeaturedProducts fields

![SectionFeaturedProducts Definition](./images/definition_section_featured_products.png 'Metaobject SectionFeaturedProducts Definition')

### SectionFeaturedCollections Definition

This definition includes a basic set of fields to render a typical grid of collections
that a merchant can curate via the admin.

#### SectionFeaturedCollections fields

![SectionFeaturedCollections Definition](./images/definition_section_featured_collections.png 'Metaobject SectionFeaturedCollections Definition')

### Store Definition

This definition includes a basic set of fields to describe the basic structure of
a store branch.

#### Store fields

![Store Definition](./images/definition_store.png 'Metaobject Store Definition')

### SectionStoreProfile Definition

This definition includes a reference field to associate a given store entry with
section entry.

#### SectionSetoreProfile fields

![SectionStoreProfile Definition](./images/definition_section_store_profile.png 'Metaobject SectionStoreProfile Definition')

### SectionStoreGrid Definition

This definition includes a stores field that allows the merchant to create a collection
of stores to display in grid.

#### SectionStoreGrid fields

![SectionStoreGrid Definition](./images/definition_section_stores_grid.png 'Metaobject SectionStoreGrid Definition')

---

## 3. Structure of a Section component

Section components have a one-to-one relationship with Section metaobject definitions.

In other words, they are a react version of the definition that you will use to
render the section entry in the frontend.

### Creating new Sections

Define the section component that will be used to render a new metaobject section
definition

```ts
export function SectionExample(props: SectionExampleFragment) {}
```

Define the section's fragment that will be used for querying. The fragment should
include all the fields from the given definition in the admin.

```ts
const EXAMPLE_MEDIA_IMAGE_FRAGMENT = '#graphql
  fragment MediaImage on MediaImage {
    image {
      altText
      url
      width
      height
    }
  }
';

export const SECTION_HERO_FRAGMENT = '#graphql
  fragment SectionExample on Metaobject {
    type
    heading: field(key: "heading") {
      key
      value
    }
    subheading: field(key: "subheading") {
      key
      value
    }
    # other fields ...
  }
  ${EXAMPLE_MEDIA_IMAGE_FRAGMENT}
';
```

Pass the props to the `parseSection` to parse the metaobject fields and simplify
the resulting route content structure.

```ts
export function SectionExample(props: SectionExampleFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);
}
```

Add the markup that defines the section

```ts
export function SectionExample(props: SectionExampleFragment) {
  const section = parseSection<
    SectionHeroFragment,
    {
      heading?: ParsedMetafields['single_line_text_field'];
      subheading?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {image, heading, subheading, link} = section;

  const backgroundImage = image?.image?.url
    ? `url("${image.image.url}")`
    : undefined;

  return (
    <section
      className="section-hero"
      style={{
        backgroundImage,
        height: '50%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        position: 'relative',
        minHeight: '500px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: '2rem',
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        {heading && <h1 style={{marginBottom: 0}}>{heading.parsedValue}</h1>}
        {subheading && <p>{subheading.value}</p>}
      </div>
    </section>
  );
}
```

### Including the Section in the Sections component

The final step is to import and include our new section in the list of renderable
sections in the Sections component

```ts
// other imported sections ...
import {SECTION_EXAMPLE_FRAGMENT, SectionExample} from '~/sections/SectionExample';

import type {SectionsFragment} from 'storefrontapi.generated';

export function Sections({sections}: {sections: SectionsFragment}) {
  return (
    <div className="sections">
      {sections?.references?.nodes.map((section) => {
        switch (section.type) {
          // other sections....
          case 'section_example':
             return <SectionExample />;
          default:
            // eslint-disable-next-line no-console
            console.log(`Unsupported section type: ${section.type}`);
            return null;
        }
      })}
    </div>
  );
}

export const SECTIONS_FRAGMENT = `#graphql
  fragment Sections on MetaobjectField {
    ... on MetaobjectField {
      references(first: 10) {
        nodes {
          ... on Metaobject {
            id
            type
            ...SectionHero
            ...SectionFeaturedProducts
            ...SectionFeaturedCollections
            ...SectionRichText
            ...SectionStores
            ...SectionStoreProfile
          }
        }
      }
    }
  }
  # All section fragments
  # other section fragments ...
  ${SECTION_EXAMPLE_FRAGMENT}
`;
```

~~~

### Step 18: Link field screenshot

A screenshot showing the Link metaobject field configuration.

#### File: [definition_link.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_link.png)

![templates/skeleton/guides/metaobjects/images/definition_link.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_link.png)

### Step 19: Featured collections definition screenshot

A screenshot of a "Featured Collections" section metaobject definition.

#### File: [definition_section_featured_collections.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_featured_collections.png)

![templates/skeleton/guides/metaobjects/images/definition_section_featured_collections.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_featured_collections.png)

### Step 20: Featured products definition screenshot

A screenshot of a "Featured Products" section metaobject definition.

#### File: [definition_section_featured_products.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_featured_products.png)

![templates/skeleton/guides/metaobjects/images/definition_section_featured_products.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_featured_products.png)

### Step 21: Hero section definition screenshot

A screenshot of a Hero section metaobject definition with image and text fields.

#### File: [definition_section_hero.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_hero.png)

![templates/skeleton/guides/metaobjects/images/definition_section_hero.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_hero.png)

### Step 22: Rich text section definition screenshot

A screenshot of a "Richtext" section metaobject definition.

#### File: [definition_section_rich_text.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_rich_text.png)

![templates/skeleton/guides/metaobjects/images/definition_section_rich_text.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_rich_text.png)

### Step 23: Store profile definition screenshot

A screenshot of a "Store Profile" section metaobject definition.

#### File: [definition_section_store_profile.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_store_profile.png)

![templates/skeleton/guides/metaobjects/images/definition_section_store_profile.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_store_profile.png)

### Step 24: Stores grid definition screenshot

A screenshot of a "Stores Grid" section metaobject definition.

#### File: [definition_section_stores_grid.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_section_stores_grid.png)

![templates/skeleton/guides/metaobjects/images/definition_section_stores_grid.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_section_stores_grid.png)

### Step 25: Store definition screenshot

A screenshot of a "Store" metaobject definition with location and contact fields.

#### File: [definition_store.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definition_store.png)

![templates/skeleton/guides/metaobjects/images/definition_store.png](ingredients/templates/skeleton/guides/metaobjects/images/definition_store.png)

### Step 26: Definitions list screenshot

A screenshot showing a list of all metaobject definitions in the Shopify admin.

#### File: [definitions_list.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definitions_list.png)

![templates/skeleton/guides/metaobjects/images/definitions_list.png](ingredients/templates/skeleton/guides/metaobjects/images/definitions_list.png)

### Step 27: Route definition screenshot

A screenshot of a "Route" metaobject definition with a "Sections" reference field.

#### File: [definiton_route.png](https://github.com/Shopify/hydrogen/blob/4f5db289f8a9beb5c46dda9416a7ae8151f7e08e/cookbook/recipes/metaobjects/ingredients/templates/skeleton/guides/metaobjects/images/definiton_route.png)

![templates/skeleton/guides/metaobjects/images/definiton_route.png](ingredients/templates/skeleton/guides/metaobjects/images/definiton_route.png)

</recipe_implementation>