# 🧑‍🍳 Metaobjects

This folder contains an example implementation of using [metaobjects](https://help.shopify.com/en/manual/custom-data/metaobjects) as a thin Content Management System (CMS) for Hydrogen.

More specifically, this example focuses on how to render and manage custom content at a route and section level.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/EditRoute.tsx`](ingredients/templates/skeleton/app/components/EditRoute.tsx) | A component that overlays an Edit Route button in routes with metaobjects for easy access to the metaobject entry in the admin dashboard |
| [`app/routes/stores.$name.tsx`](ingredients/templates/skeleton/app/routes/stores.$name.tsx) | A dynamic route that displays custom store metaobject profiles |
| [`app/routes/stores._index.tsx`](ingredients/templates/skeleton/app/routes/stores._index.tsx) | A route that displays a collection of custom store entries |
| [`app/sections/RouteContent.tsx`](ingredients/templates/skeleton/app/sections/RouteContent.tsx) |  |
| [`app/sections/SectionFeaturedCollections.tsx`](ingredients/templates/skeleton/app/sections/SectionFeaturedCollections.tsx) |  |
| [`app/sections/SectionFeaturedProducts.tsx`](ingredients/templates/skeleton/app/sections/SectionFeaturedProducts.tsx) |  |
| [`app/sections/SectionHero.tsx`](ingredients/templates/skeleton/app/sections/SectionHero.tsx) |  |
| [`app/sections/SectionStoreProfile.tsx`](ingredients/templates/skeleton/app/sections/SectionStoreProfile.tsx) | Override metafields types that have been parsed. |
| [`app/sections/SectionStores.tsx`](ingredients/templates/skeleton/app/sections/SectionStores.tsx) | Override metafields types that have been parsed. |
| [`app/sections/Sections.tsx`](ingredients/templates/skeleton/app/sections/Sections.tsx) |  |
| [`app/utils/parseSection.ts`](ingredients/templates/skeleton/app/utils/parseSection.ts) | - Recursively parse metafields (objects containing a type, value and key).
- Lifts each key in an array from an object, and returns a new object with the keys removed. |
| [`docs/METAOBJECTS.md`](ingredients/templates/skeleton/docs/METAOBJECTS.md) |  |
| [`docs/images/definition_link.png`](ingredients/templates/skeleton/docs/images/definition_link.png) |  |
| [`docs/images/definition_section_featured_collections.png`](ingredients/templates/skeleton/docs/images/definition_section_featured_collections.png) |  |
| [`docs/images/definition_section_featured_products.png`](ingredients/templates/skeleton/docs/images/definition_section_featured_products.png) |  |
| [`docs/images/definition_section_hero.png`](ingredients/templates/skeleton/docs/images/definition_section_hero.png) |  |
| [`docs/images/definition_section_rich_text.png`](ingredients/templates/skeleton/docs/images/definition_section_rich_text.png) |  |
| [`docs/images/definition_section_store_profile.png`](ingredients/templates/skeleton/docs/images/definition_section_store_profile.png) |  |
| [`docs/images/definition_section_stores_grid.png`](ingredients/templates/skeleton/docs/images/definition_section_stores_grid.png) |  |
| [`docs/images/definition_store.png`](ingredients/templates/skeleton/docs/images/definition_store.png) |  |
| [`docs/images/definitions_list.png`](ingredients/templates/skeleton/docs/images/definitions_list.png) |  |
| [`docs/images/definiton_route.png`](ingredients/templates/skeleton/docs/images/definiton_route.png) |  |

## 🍱 Steps

### 1. Requirements

> [!NOTE]
> (Optional) If you prefer to use your own store instead, please follow the [instructions](./docs/METAOBJECTS.md) to configure the same content architecture.

- Basic understanding of metaobjects. Creating metaobject [definitions](https://help.shopify.com/en/manual/custom-data/metaobjects/building-a-metaobject), creating metaobject [entries](https://help.shopify.com/en/manual/custom-data/metaobjects/creating-entries). For more info, please refer to this [tutorial](https://help.shopify.com/en/manual/custom-data/metaobjects/using-metaobjects)

- Must use the "mock.shop" store because it has the required definitions and entries to make this example work.

### 2. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/EditRoute.tsx`
- `app/routes/stores.$name.tsx`
- `app/routes/stores._index.tsx`
- `app/sections/RouteContent.tsx`
- `app/sections/SectionFeaturedCollections.tsx`
- `app/sections/SectionFeaturedProducts.tsx`
- `app/sections/SectionHero.tsx`
- `app/sections/SectionStoreProfile.tsx`
- `app/sections/SectionStores.tsx`
- `app/sections/Sections.tsx`
- `app/utils/parseSection.ts`
- `docs/METAOBJECTS.md`
- `docs/images/definition_link.png`
- `docs/images/definition_section_featured_collections.png`
- `docs/images/definition_section_featured_products.png`
- `docs/images/definition_section_hero.png`
- `docs/images/definition_section_rich_text.png`
- `docs/images/definition_section_store_profile.png`
- `docs/images/definition_section_stores_grid.png`
- `docs/images/definition_store.png`
- `docs/images/definitions_list.png`
- `docs/images/definiton_route.png`

### 3. Return the PUBLIC_SHOPIFY_STORE_DOMAIN from the root layout

To enable the Edit Route button return the env variable as `publicStoreSubdomain`.

#### File: [`app/root.tsx`](/templates/skeleton/app/root.tsx)

<details>

```diff
index a4f7c673..a9c5d9f9 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -65,19 +65,35 @@ export function links() {
   ];
 }
 
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
+export async function loader({context}: LoaderFunctionArgs) {
+  const {storefront, customerAccount, cart, env} = context;
+  const publicStoreDomain = env.PUBLIC_STORE_DOMAIN;
 
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+  const isLoggedInPromise = customerAccount.isLoggedIn();
+  const cartPromise = cart.get();
 
-  const {storefront, env} = args.context;
+  // defer the footer query (below the fold)
+  const footerPromise = storefront.query(FOOTER_QUERY, {
+    cache: storefront.CacheLong(),
+    variables: {
+      footerMenuHandle: 'footer', // Adjust to your footer menu handle
+    },
+  });
+
+  // await the header query (above the fold)
+  const headerPromise = storefront.query(HEADER_QUERY, {
+    cache: storefront.CacheLong(),
+    variables: {
+      headerMenuHandle: 'main-menu', // Adjust to your header menu handle
+    },
+  });
 
   return {
-    ...deferredData,
-    ...criticalData,
-    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
+    cart: cartPromise,
+    footer: footerPromise,
+    header: await headerPromise,
+    isLoggedIn: isLoggedInPromise,
+    publicStoreDomain,
     shop: getShopAnalytics({
       storefront,
       publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
@@ -85,59 +101,12 @@ export async function loader(args: LoaderFunctionArgs) {
     consent: {
       checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
-      withPrivacyBanner: false,
+      withPrivacyBanner: true,
       // localize the privacy banner
-      country: args.context.storefront.i18n.country,
-      language: args.context.storefront.i18n.language,
+      country: context.storefront.i18n.country,
+      language: context.storefront.i18n.language,
     },
-  };
-}
-
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({context}: LoaderFunctionArgs) {
-  const {storefront} = context;
-
-  const [header] = await Promise.all([
-    storefront.query(HEADER_QUERY, {
-      cache: storefront.CacheLong(),
-      variables: {
-        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
-      },
-    }),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
-
-  return {header};
-}
-
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context}: LoaderFunctionArgs) {
-  const {storefront, customerAccount, cart} = context;
-
-  // defer the footer query (below the fold)
-  const footer = storefront
-    .query(FOOTER_QUERY, {
-      cache: storefront.CacheLong(),
-      variables: {
-        footerMenuHandle: 'footer', // Adjust to your footer menu handle
-      },
-    })
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-  return {
-    cart: cart.get(),
-    isLoggedIn: customerAccount.isLoggedIn(),
-    footer,
+    publictoreSubdomain: context.env.PUBLIC_SHOPIFY_STORE_DOMAIN,
   };
 }
 

```

</details>

#### File: [`env.d.ts`](/templates/skeleton/env.d.ts)

```diff
index c9538bf4..1d25e3b6 100644
--- a/templates/skeleton/env.d.ts
+++ b/templates/skeleton/env.d.ts
@@ -20,6 +20,7 @@ declare global {
 
   interface Env extends HydrogenEnv {
     // declare additional Env parameter use in the fetch handler and Remix loader context here
+    PUBLIC_SHOPIFY_STORE_DOMAIN: string;
   }
 }
 

```

### 4. Modify the homepage route

- Add metaobject content imports.
- Query the home route metaobject.

#### File: [`app/routes/_index.tsx`](/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 9fa33642..9149699f 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,182 +1,32 @@
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {Await, useLoaderData, Link, type MetaFunction} from '@remix-run/react';
-import {Suspense} from 'react';
-import {Image, Money} from '@shopify/hydrogen';
-import type {
-  FeaturedCollectionFragment,
-  RecommendedProductsQuery,
-} from 'storefrontapi.generated';
+import {useLoaderData, type MetaFunction} from '@remix-run/react';
+
+// 1. Add metaobject content imports
+import {ROUTE_CONTENT_QUERY, RouteContent} from '~/sections/RouteContent';
 
 export const meta: MetaFunction = () => {
   return [{title: 'Hydrogen | Home'}];
 };
 
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
+export async function loader({context}: LoaderFunctionArgs) {
+  const {storefront} = context;
 
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+  // 2. Query the home route metaobject
+  const {route} = await storefront.query(ROUTE_CONTENT_QUERY, {
+    variables: {handle: 'route-home'},
+    cache: storefront.CacheNone(),
+  });
 
-  return {...deferredData, ...criticalData};
-}
-
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({context}: LoaderFunctionArgs) {
-  const [{collections}] = await Promise.all([
-    context.storefront.query(FEATURED_COLLECTION_QUERY),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
-
-  return {
-    featuredCollection: collections.nodes[0],
-  };
-}
-
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context}: LoaderFunctionArgs) {
-  const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-
-  return {
-    recommendedProducts,
-  };
+  return {route};
 }
 
 export default function Homepage() {
-  const data = useLoaderData<typeof loader>();
+  const {route} = useLoaderData<typeof loader>();
+
   return (
     <div className="home">
-      <FeaturedCollection collection={data.featuredCollection} />
-      <RecommendedProducts products={data.recommendedProducts} />
+      {/* 3. Render the route's content sections */}
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
-                    <Link
-                      key={product.id}
-                      className="recommended-product"
-                      to={`/products/${product.handle}`}
-                    >
-                      <Image
-                        data={product.images.nodes[0]}
-                        aspectRatio="1/1"
-                        sizes="(min-width: 45em) 20vw, 50vw"
-                      />
-                      <h4>{product.title}</h4>
-                      <small>
-                        <Money data={product.priceRange.minVariantPrice} />
-                      </small>
-                    </Link>
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
-    images(first: 1) {
-      nodes {
-        id
-        url
-        altText
-        width
-        height
-      }
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

```

</details>

### 5. Codegen



#### File: [`storefrontapi.generated.d.ts`](/templates/skeleton/storefrontapi.generated.d.ts)

<details>

```diff
index d27c5942..13479423 100644
--- a/templates/skeleton/storefrontapi.generated.d.ts
+++ b/templates/skeleton/storefrontapi.generated.d.ts
@@ -295,77 +295,6 @@ export type StoreRobotsQueryVariables = StorefrontAPI.Exact<{
 
 export type StoreRobotsQuery = {shop: Pick<StorefrontAPI.Shop, 'id'>};
 
-export type FeaturedCollectionFragment = Pick<
-  StorefrontAPI.Collection,
-  'id' | 'title' | 'handle'
-> & {
-  image?: StorefrontAPI.Maybe<
-    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
-  >;
-};
-
-export type FeaturedCollectionQueryVariables = StorefrontAPI.Exact<{
-  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
-  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
-}>;
-
-export type FeaturedCollectionQuery = {
-  collections: {
-    nodes: Array<
-      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
-        image?: StorefrontAPI.Maybe<
-          Pick<
-            StorefrontAPI.Image,
-            'id' | 'url' | 'altText' | 'width' | 'height'
-          >
-        >;
-      }
-    >;
-  };
-};
-
-export type RecommendedProductFragment = Pick<
-  StorefrontAPI.Product,
-  'id' | 'title' | 'handle'
-> & {
-  priceRange: {
-    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
-  };
-  images: {
-    nodes: Array<
-      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
-    >;
-  };
-};
-
-export type RecommendedProductsQueryVariables = StorefrontAPI.Exact<{
-  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
-  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
-}>;
-
-export type RecommendedProductsQuery = {
-  products: {
-    nodes: Array<
-      Pick<StorefrontAPI.Product, 'id' | 'title' | 'handle'> & {
-        priceRange: {
-          minVariantPrice: Pick<
-            StorefrontAPI.MoneyV2,
-            'amount' | 'currencyCode'
-          >;
-        };
-        images: {
-          nodes: Array<
-            Pick<
-              StorefrontAPI.Image,
-              'id' | 'url' | 'altText' | 'width' | 'height'
-            >
-          >;
-        };
-      }
-    >;
-  };
-};
-
 export type ArticleQueryVariables = StorefrontAPI.Exact<{
   articleHandle: StorefrontAPI.Scalars['String']['input'];
   blogHandle: StorefrontAPI.Scalars['String']['input'];
@@ -1164,6 +1093,634 @@ export type PredictiveSearchQuery = {
   }>;
 };
 
+export type RouteContentQueryVariables = StorefrontAPI.Exact<{
+  handle: StorefrontAPI.Scalars['String']['input'];
+}>;
+
+export type RouteContentQuery = {
+  route?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Metaobject, 'type' | 'id'> & {
+      title?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+      >;
+      sections?: StorefrontAPI.Maybe<{
+        references?: StorefrontAPI.Maybe<{
+          nodes: Array<
+            Pick<StorefrontAPI.Metaobject, 'id' | 'type' | 'handle'> & {
+              heading?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value' | 'type'>
+              >;
+              subheading?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+              >;
+              link?: StorefrontAPI.Maybe<{
+                reference?: StorefrontAPI.Maybe<{
+                  href?: StorefrontAPI.Maybe<
+                    Pick<StorefrontAPI.MetaobjectField, 'value'>
+                  >;
+                  target?: StorefrontAPI.Maybe<
+                    Pick<StorefrontAPI.MetaobjectField, 'value'>
+                  >;
+                  text?: StorefrontAPI.Maybe<
+                    Pick<StorefrontAPI.MetaobjectField, 'value'>
+                  >;
+                }>;
+              }>;
+              image?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+                  reference?: StorefrontAPI.Maybe<{
+                    image?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.Image,
+                        'altText' | 'url' | 'width' | 'height'
+                      >
+                    >;
+                  }>;
+                }
+              >;
+              body?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+              >;
+              products?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+                  references?: StorefrontAPI.Maybe<{
+                    nodes: Array<
+                      Pick<
+                        StorefrontAPI.Product,
+                        'id' | 'title' | 'handle' | 'productType'
+                      > & {
+                        variants: {
+                          nodes: Array<
+                            Pick<StorefrontAPI.ProductVariant, 'title'> & {
+                              image?: StorefrontAPI.Maybe<
+                                Pick<
+                                  StorefrontAPI.Image,
+                                  'altText' | 'width' | 'height' | 'url'
+                                >
+                              >;
+                            }
+                          >;
+                        };
+                        priceRange: {
+                          minVariantPrice: Pick<
+                            StorefrontAPI.MoneyV2,
+                            'amount' | 'currencyCode'
+                          >;
+                        };
+                      }
+                    >;
+                  }>;
+                }
+              >;
+              withProductPrices?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+              >;
+              collections?: StorefrontAPI.Maybe<{
+                references?: StorefrontAPI.Maybe<{
+                  nodes: Array<
+                    Pick<
+                      StorefrontAPI.Collection,
+                      'id' | 'title' | 'handle'
+                    > & {
+                      image?: StorefrontAPI.Maybe<
+                        Pick<
+                          StorefrontAPI.Image,
+                          'altText' | 'width' | 'height' | 'url'
+                        >
+                      >;
+                    }
+                  >;
+                }>;
+              }>;
+              withCollectionTitles?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              stores?: StorefrontAPI.Maybe<{
+                references?: StorefrontAPI.Maybe<{
+                  nodes: Array<
+                    Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+                      heading?: StorefrontAPI.Maybe<
+                        Pick<
+                          StorefrontAPI.MetaobjectField,
+                          'type' | 'key' | 'value'
+                        >
+                      >;
+                      address?: StorefrontAPI.Maybe<
+                        Pick<
+                          StorefrontAPI.MetaobjectField,
+                          'type' | 'key' | 'value'
+                        >
+                      >;
+                      image?: StorefrontAPI.Maybe<
+                        Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+                          reference?: StorefrontAPI.Maybe<{
+                            image?: StorefrontAPI.Maybe<
+                              Pick<
+                                StorefrontAPI.Image,
+                                'altText' | 'url' | 'width' | 'height'
+                              >
+                            >;
+                          }>;
+                        }
+                      >;
+                    }
+                  >;
+                }>;
+              }>;
+              store?: StorefrontAPI.Maybe<{
+                reference?: StorefrontAPI.Maybe<
+                  Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+                    title?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.MetaobjectField,
+                        'type' | 'key' | 'value'
+                      >
+                    >;
+                    heading?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.MetaobjectField,
+                        'type' | 'key' | 'value'
+                      >
+                    >;
+                    description?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.MetaobjectField,
+                        'type' | 'key' | 'value'
+                      >
+                    >;
+                    address?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.MetaobjectField,
+                        'type' | 'key' | 'value'
+                      >
+                    >;
+                    hours?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.MetaobjectField,
+                        'type' | 'key' | 'value'
+                      >
+                    >;
+                    image?: StorefrontAPI.Maybe<
+                      Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
+                        reference?: StorefrontAPI.Maybe<{
+                          image?: StorefrontAPI.Maybe<
+                            Pick<
+                              StorefrontAPI.Image,
+                              'altText' | 'url' | 'width' | 'height'
+                            >
+                          >;
+                        }>;
+                      }
+                    >;
+                  }
+                >;
+              }>;
+            }
+          >;
+        }>;
+      }>;
+    }
+  >;
+};
+
+export type FeaturedCollectionImageFragment = Pick<
+  StorefrontAPI.Image,
+  'altText' | 'width' | 'height' | 'url'
+>;
+
+export type FeaturedCollectionFragment = Pick<
+  StorefrontAPI.Collection,
+  'id' | 'title' | 'handle'
+> & {
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
+  >;
+};
+
+export type SectionFeaturedCollectionsFieldFragment = Pick<
+  StorefrontAPI.MetaobjectField,
+  'type' | 'key' | 'value'
+>;
+
+export type SectionFeaturedCollectionsFragment = Pick<
+  StorefrontAPI.Metaobject,
+  'type' | 'id'
+> & {
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  collections?: StorefrontAPI.Maybe<{
+    references?: StorefrontAPI.Maybe<{
+      nodes: Array<
+        Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
+          image?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
+          >;
+        }
+      >;
+    }>;
+  }>;
+  withCollectionTitles?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+};
+
+export type FeaturedProductFragment = Pick<
+  StorefrontAPI.Product,
+  'id' | 'title' | 'handle' | 'productType'
+> & {
+  variants: {
+    nodes: Array<
+      Pick<StorefrontAPI.ProductVariant, 'title'> & {
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.Image, 'altText' | 'width' | 'height' | 'url'>
+        >;
+      }
+    >;
+  };
+  priceRange: {
+    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  };
+};
+
+export type SectionFeaturedProductsFragment = Pick<
+  StorefrontAPI.Metaobject,
+  'type'
+> & {
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+  >;
+  body?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+  >;
+  products?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+      references?: StorefrontAPI.Maybe<{
+        nodes: Array<
+          Pick<
+            StorefrontAPI.Product,
+            'id' | 'title' | 'handle' | 'productType'
+          > & {
+            variants: {
+              nodes: Array<
+                Pick<StorefrontAPI.ProductVariant, 'title'> & {
+                  image?: StorefrontAPI.Maybe<
+                    Pick<
+                      StorefrontAPI.Image,
+                      'altText' | 'width' | 'height' | 'url'
+                    >
+                  >;
+                }
+              >;
+            };
+            priceRange: {
+              minVariantPrice: Pick<
+                StorefrontAPI.MoneyV2,
+                'amount' | 'currencyCode'
+              >;
+            };
+          }
+        >;
+      }>;
+    }
+  >;
+  withProductPrices?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+  >;
+};
+
+export type MediaImageFragment = {
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
+  >;
+};
+
+export type LinkFragment = {
+  reference?: StorefrontAPI.Maybe<{
+    href?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
+    target?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
+    text?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
+  }>;
+};
+
+export type SectionHeroFragment = Pick<StorefrontAPI.Metaobject, 'type'> & {
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+  >;
+  subheading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+  >;
+  link?: StorefrontAPI.Maybe<{
+    reference?: StorefrontAPI.Maybe<{
+      href?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
+      target?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.MetaobjectField, 'value'>
+      >;
+      text?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
+    }>;
+  }>;
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+      reference?: StorefrontAPI.Maybe<{
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
+        >;
+      }>;
+    }
+  >;
+};
+
+export type StoreProfileFieldFragment = Pick<
+  StorefrontAPI.MetaobjectField,
+  'type' | 'key' | 'value'
+>;
+
+export type StoreProfileFragment = Pick<
+  StorefrontAPI.Metaobject,
+  'type' | 'id' | 'handle'
+> & {
+  title?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  description?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  address?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  hours?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
+      reference?: StorefrontAPI.Maybe<{
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
+        >;
+      }>;
+    }
+  >;
+};
+
+export type SectionStoreProfileFragment = Pick<
+  StorefrontAPI.Metaobject,
+  'type' | 'id' | 'handle'
+> & {
+  store?: StorefrontAPI.Maybe<{
+    reference?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+        title?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        heading?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        description?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        address?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        hours?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
+            reference?: StorefrontAPI.Maybe<{
+              image?: StorefrontAPI.Maybe<
+                Pick<
+                  StorefrontAPI.Image,
+                  'altText' | 'url' | 'width' | 'height'
+                >
+              >;
+            }>;
+          }
+        >;
+      }
+    >;
+  }>;
+};
+
+export type StoreItemFieldFragment = Pick<
+  StorefrontAPI.MetaobjectField,
+  'type' | 'key' | 'value'
+>;
+
+export type StoreItemImageFragment = {
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
+  >;
+};
+
+export type StoreItemFragment = Pick<
+  StorefrontAPI.Metaobject,
+  'type' | 'id' | 'handle'
+> & {
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  address?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+      reference?: StorefrontAPI.Maybe<{
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.Image, 'altText' | 'url' | 'width' | 'height'>
+        >;
+      }>;
+    }
+  >;
+};
+
+export type SectionStoresFragment = Pick<StorefrontAPI.Metaobject, 'type'> & {
+  heading?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+  >;
+  stores?: StorefrontAPI.Maybe<{
+    references?: StorefrontAPI.Maybe<{
+      nodes: Array<
+        Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+          heading?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+          >;
+          address?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+          >;
+          image?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+              reference?: StorefrontAPI.Maybe<{
+                image?: StorefrontAPI.Maybe<
+                  Pick<
+                    StorefrontAPI.Image,
+                    'altText' | 'url' | 'width' | 'height'
+                  >
+                >;
+              }>;
+            }
+          >;
+        }
+      >;
+    }>;
+  }>;
+};
+
+export type SectionsFragment = {
+  references?: StorefrontAPI.Maybe<{
+    nodes: Array<
+      Pick<StorefrontAPI.Metaobject, 'id' | 'type' | 'handle'> & {
+        heading?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value' | 'type'>
+        >;
+        subheading?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+        >;
+        link?: StorefrontAPI.Maybe<{
+          reference?: StorefrontAPI.Maybe<{
+            href?: StorefrontAPI.Maybe<
+              Pick<StorefrontAPI.MetaobjectField, 'value'>
+            >;
+            target?: StorefrontAPI.Maybe<
+              Pick<StorefrontAPI.MetaobjectField, 'value'>
+            >;
+            text?: StorefrontAPI.Maybe<
+              Pick<StorefrontAPI.MetaobjectField, 'value'>
+            >;
+          }>;
+        }>;
+        image?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+            reference?: StorefrontAPI.Maybe<{
+              image?: StorefrontAPI.Maybe<
+                Pick<
+                  StorefrontAPI.Image,
+                  'altText' | 'url' | 'width' | 'height'
+                >
+              >;
+            }>;
+          }
+        >;
+        body?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+        >;
+        products?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+            references?: StorefrontAPI.Maybe<{
+              nodes: Array<
+                Pick<
+                  StorefrontAPI.Product,
+                  'id' | 'title' | 'handle' | 'productType'
+                > & {
+                  variants: {
+                    nodes: Array<
+                      Pick<StorefrontAPI.ProductVariant, 'title'> & {
+                        image?: StorefrontAPI.Maybe<
+                          Pick<
+                            StorefrontAPI.Image,
+                            'altText' | 'width' | 'height' | 'url'
+                          >
+                        >;
+                      }
+                    >;
+                  };
+                  priceRange: {
+                    minVariantPrice: Pick<
+                      StorefrontAPI.MoneyV2,
+                      'amount' | 'currencyCode'
+                    >;
+                  };
+                }
+              >;
+            }>;
+          }
+        >;
+        withProductPrices?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
+        >;
+        collections?: StorefrontAPI.Maybe<{
+          references?: StorefrontAPI.Maybe<{
+            nodes: Array<
+              Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
+                image?: StorefrontAPI.Maybe<
+                  Pick<
+                    StorefrontAPI.Image,
+                    'altText' | 'width' | 'height' | 'url'
+                  >
+                >;
+              }
+            >;
+          }>;
+        }>;
+        withCollectionTitles?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+        >;
+        stores?: StorefrontAPI.Maybe<{
+          references?: StorefrontAPI.Maybe<{
+            nodes: Array<
+              Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+                heading?: StorefrontAPI.Maybe<
+                  Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+                >;
+                address?: StorefrontAPI.Maybe<
+                  Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+                >;
+                image?: StorefrontAPI.Maybe<
+                  Pick<StorefrontAPI.MetaobjectField, 'key'> & {
+                    reference?: StorefrontAPI.Maybe<{
+                      image?: StorefrontAPI.Maybe<
+                        Pick<
+                          StorefrontAPI.Image,
+                          'altText' | 'url' | 'width' | 'height'
+                        >
+                      >;
+                    }>;
+                  }
+                >;
+              }
+            >;
+          }>;
+        }>;
+        store?: StorefrontAPI.Maybe<{
+          reference?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.Metaobject, 'type' | 'id' | 'handle'> & {
+              title?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              heading?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              description?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              address?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              hours?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key' | 'value'>
+              >;
+              image?: StorefrontAPI.Maybe<
+                Pick<StorefrontAPI.MetaobjectField, 'type' | 'key'> & {
+                  reference?: StorefrontAPI.Maybe<{
+                    image?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.Image,
+                        'altText' | 'url' | 'width' | 'height'
+                      >
+                    >;
+                  }>;
+                }
+              >;
+            }
+          >;
+        }>;
+      }
+    >;
+  }>;
+};
+
 interface GeneratedQueryTypes {
   '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
     return: HeaderQuery;
@@ -1177,14 +1734,6 @@ interface GeneratedQueryTypes {
     return: StoreRobotsQuery;
     variables: StoreRobotsQueryVariables;
   };
-  '#graphql\n  fragment FeaturedCollection on Collection {\n    id\n    title\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n    handle\n  }\n  query FeaturedCollection($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...FeaturedCollection\n      }\n    }\n  }\n': {
-    return: FeaturedCollectionQuery;
-    variables: FeaturedCollectionQueryVariables;
-  };
-  '#graphql\n  fragment RecommendedProduct on Product {\n    id\n    title\n    handle\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    images(first: 1) {\n      nodes {\n        id\n        url\n        altText\n        width\n        height\n      }\n    }\n  }\n  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    products(first: 4, sortKey: UPDATED_AT, reverse: true) {\n      nodes {\n        ...RecommendedProduct\n      }\n    }\n  }\n': {
-    return: RecommendedProductsQuery;
-    variables: RecommendedProductsQueryVariables;
-  };
   '#graphql\n  query Article(\n    $articleHandle: String!\n    $blogHandle: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    blog(handle: $blogHandle) {\n      articleByHandle(handle: $articleHandle) {\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
     return: ArticleQuery;
     variables: ArticleQueryVariables;
@@ -1233,6 +1782,10 @@ interface GeneratedQueryTypes {
     return: PredictiveSearchQuery;
     variables: PredictiveSearchQueryVariables;
   };
+  '#graphql\n  query RouteContent($handle: String!) {\n    route: metaobject(handle: {type: "route", handle: $handle}) {\n      type\n      id\n      title: field(key: "title") {\n        key\n        value\n      }\n      sections: field(key: "sections") {\n        ...Sections\n      }\n    }\n  }\n  #graphql\n  fragment Sections on MetaobjectField {\n    ... on MetaobjectField {\n      references(first: 10) {\n        nodes {\n          ... on Metaobject {\n            id\n            type\n            ...SectionHero\n            ...SectionFeaturedProducts\n            ...SectionFeaturedCollections\n            ...SectionStores\n            ...SectionStoreProfile\n          }\n        }\n      }\n    }\n  }\n  # All section fragments\n  #graphql\n  fragment SectionHero on Metaobject {\n    type\n    heading: field(key: "heading") {\n      key\n      value\n    }\n    subheading: field(key: "subheading") {\n      key\n      value\n    }\n    link: field(key: "link") {\n      ...Link\n    }\n    image: field(key: "image") {\n      key\n      reference {\n        ... on MediaImage {\n          ...MediaImage\n        }\n      }\n    }\n  }\n  #graphql\n  fragment Link on MetaobjectField {\n    ... on MetaobjectField {\n      reference {\n        ...on Metaobject {\n          href: field(key: "href") {\n            value\n          }\n          target: field(key: "target") {\n            value\n          }\n          text: field(key: "text") {\n            value\n          }\n        }\n      }\n    }\n  }\n\n  #graphql\n  fragment MediaImage on MediaImage {\n    image {\n      altText\n      url\n      width\n      height\n    }\n  }\n\n\n  #graphql\n  fragment SectionFeaturedProducts on Metaobject {\n    type\n    heading: field(key: "heading") {\n      key\n      value\n    }\n    body: field(key: "body") {\n      key\n      value\n    }\n    products: field(key: "products") {\n      key\n      references(first: 10) {\n        nodes {\n          ... on Product {\n            ...FeaturedProduct\n          }\n        }\n      }\n    }\n    withProductPrices: field(key: "with_product_prices") {\n      key\n      value\n    }\n  }\n  #graphql\n  fragment FeaturedProduct on Product {\n    id\n    title\n    handle\n    productType\n    variants(first: 1) {\n      nodes {\n        title\n        image {\n          altText\n          width\n          height\n          url\n        }\n      }\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n  }\n\n\n  #graphql\n  fragment SectionFeaturedCollectionsField on MetaobjectField {\n    type\n    key\n    value\n  }\n  fragment SectionFeaturedCollections on Metaobject {\n    type\n    id\n    heading: field(key: "heading") {\n      ...SectionFeaturedCollectionsField\n    }\n    collections: field(key: "collections") {\n      references(first: 10) {\n        nodes {\n          ... on Collection {\n            ...FeaturedCollection\n          }\n        }\n      }\n    }\n    withCollectionTitles: field(key: "with_collection_titles") {\n     ...SectionFeaturedCollectionsField\n    }\n  }\n  #graphql\n  fragment FeaturedCollectionImage on Image {\n    altText\n    width\n    height\n    url\n  }\n\n  fragment FeaturedCollection on Collection {\n    id\n    title\n    handle\n    image {\n      ...FeaturedCollectionImage\n    }\n  }\n\n\n  #graphql\n  fragment SectionStores on Metaobject {\n    type\n    heading: field(key: "heading") {\n      ...StoreItemField\n    }\n    stores: field(key: "stores") {\n      references(first: 10) {\n        nodes {\n          ...StoreItem\n        }\n      }\n    }\n  }\n  #graphql\n  fragment StoreItemField on MetaobjectField {\n    type\n    key\n    value\n  }\n  fragment StoreItemImage on MediaImage {\n    image {\n      altText\n      url(transform: {maxWidth: 600, maxHeight: 600})\n      width\n      height\n    }\n  }\n\n  fragment StoreItem on Metaobject {\n    type\n    id\n    handle\n    heading: field(key: "heading") {\n      ...StoreItemField\n    }\n    address: field(key: "address") {\n      ...StoreItemField\n    }\n    image: field(key: "image") {\n      key\n      reference {\n        ... on MediaImage {\n          ...StoreItemImage\n        }\n      }\n    }\n}\n \n  #graphql\n  fragment SectionStoreProfile on Metaobject {\n    type\n    id\n    handle\n    store: field(key: "store") {\n       reference {\n          ...on Metaobject {\n            ...StoreProfile\n          }\n       }\n    }\n  }\n  #graphql\n  fragment StoreProfileField on MetaobjectField {\n    type\n    key\n    value\n  }\n\n  fragment StoreProfile on Metaobject {\n    type\n    id\n    handle\n    title: field(key: "title") {\n      ...StoreProfileField\n    }\n    heading: field(key: "heading") {\n      ...StoreProfileField\n    }\n    description: field(key: "description") {\n      ...StoreProfileField\n    }\n    address: field(key: "address") {\n      ...StoreProfileField\n    }\n    hours: field(key: "hours") {\n      ...StoreProfileField\n    }\n    image: field(key: "image") {\n      type\n      key\n      reference {\n        ... on MediaImage {\n          image {\n            altText\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n\n\n\n': {
+    return: RouteContentQuery;
+    variables: RouteContentQueryVariables;
+  };
 }
 
 interface GeneratedMutationTypes {}

```

</details>