# Overview

This prompt describes how to implement "Bundles" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Display product bundles on your Hydrogen storefront.

# User Intent Recognition

<user_queries>
- How do I show product bundles on my Hydrogen storefront?
- How do I add badges to bundled products on my Hydrogen storefront?
- How do I display product bundles on applicable line items in the cart?
- How do I detect if a product is a bundle?
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: I'm not seeing product bundles on my storefront.
  **Solution**: Make sure you've installed the Shopify Bundles app and set up product bundles in your Shopify admin.
- **Issue**: I'm not seeing product bundle badges on product pages.
  **Solution**: Make sure you've installed the Shopify Bundles app and set up product bundles in your Shopify admin. Then make sure you've updated the product fragment to query for bundles and display BundledVariants.
- **Issue**: I'm not seeing the product bundle badges on my cart line items.
  **Solution**: Make sure you've installed the Shopify Bundles app and set up product bundles in your Shopify admin. Then make sure you've updated the cart fragment to query for bundles.
</troubleshooting>

# Recipe Implementation

Here's the bundles recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe adds special styling for product bundles on your Hydrogen
storefront. Customers will see badges and relevant cover images for bundles
when they're viewing product and collection pages.

In this recipe you'll make the following changes:

1. Set up the Shopify Bundles app in your Shopify admin and create a new
product bundle.
2. Update the GraphQL fragments to query for bundles to identify bundled
products.
3. Update the product and collection templates to display badges on product
listings, update the copy for the cart buttons, and display bundle-specific
information on product and collection pages.
4. Update the cart line item template to display the bundle badge as needed.

## Requirements

To use product bundles, you need to install a bundles app in your Shopify admin.
In this recipe, we'll use the [Shopify Bundles app](https://apps.shopify.com/shopify-bundles).

## New files added to the template by this recipe

- app/components/BundleBadge.tsx
- app/components/BundledVariants.tsx

## Steps

### Step 1: Set up the Shopify Bundles app

1. Install the [Shopify Bundles app](https://apps.shopify.com/shopify-bundles) in your Shopify admin.

2. Make sure your store meets the [eligibility requirements](https://help.shopify.com/en/manual/products/bundles/eligibility-and-considerations).

3. From the [**Bundles**](https://admin.shopify.com/apps/shopify-bundles/app) page, [create a new bundle](https://help.shopify.com/en/manual/products/bundles/shopify-bundles).

### Step 2: Create the BundleBadge component

Create a new BundleBadge component to be displayed on bundle product listings.

#### File: [BundleBadge.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/bundles/ingredients/templates/skeleton/app/components/BundleBadge.tsx)

~~~tsx
export function BundleBadge() {
  return (
    <div
      style={{
        position: 'absolute',
        padding: '.5rem .75rem',
        fontSize: '11px',
        backgroundColor: '#10804c',
        color: 'white',
        top: '1rem',
        right: '1rem',
      }}
    >
      BUNDLE
    </div>
  );
}

~~~

### Step 3: Create a new BundledVariants component

Create a new `BundledVariants` component that wraps the variants of a bundle product in a single product listing.

#### File: [BundledVariants.tsx](https://github.com/Shopify/hydrogen/blob/12374c8f03f82c6800000cf08e327c4db4c287bb/cookbook/recipes/bundles/ingredients/templates/skeleton/app/components/BundledVariants.tsx)

~~~tsx
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {
  ProductVariantComponent,
  Image as ShopifyImage,
} from '@shopify/hydrogen/storefront-api-types';

export function BundledVariants({
  variants,
}: {
  variants: ProductVariantComponent[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '1rem',
      }}
    >
      {variants
        ?.map(({productVariant: bundledVariant, quantity}) => {
          const url = `/products/${bundledVariant.product.handle}`;
          return (
            <Link
              style={{
                display: 'flex',
                flexDirection: 'row',
                marginBottom: '.5rem',
              }}
              to={url}
              key={bundledVariant.id}
            >
              <Image
                alt={bundledVariant.title}
                aspectRatio="1/1"
                height={60}
                loading="lazy"
                width={60}
                data={bundledVariant.image as ShopifyImage}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: '1rem',
                }}
              >
                <small>
                  {bundledVariant.product.title}
                  {bundledVariant.title !== 'Default Title'
                    ? `- ${bundledVariant.title}`
                    : null}
                </small>
                <small>Qty: {quantity}</small>
              </div>
            </Link>
          );
        })
        .filter(Boolean)}
    </div>
  );
}

~~~

### Step 4: Add maxVariantPrice to the product fields for RecommendedProducts

Add `maxVariantPrice` to the `RecommendedProducts` query's product fields.

#### File: /app/routes/_index.tsx

~~~diff
@@ -151,6 +151,10 @@ const RECOMMENDED_PRODUCTS_QUERY = `#graphql
         amount
         currencyCode
       }
+      maxVariantPrice {
+        amount
+        currencyCode
+      }
     }
     featuredImage {
       id
~~~

### Step 5: Update the product fragment to query for bundles and display BundledVariants

1. Add the `requiresComponents` field to the `Product` fragment, which is
used to identify bundled products.
2. Pass the `isBundle` flag to the `ProductImage` component.

#### File: /app/routes/products.$handle.tsx

~~~diff
@@ -15,6 +15,8 @@ import {ProductPrice} from '~/components/ProductPrice';
 import {ProductImage} from '~/components/ProductImage';
 import {ProductForm} from '~/components/ProductForm';
 import {redirectIfHandleIsLocalized} from '~/lib/redirect';
+import type {ProductVariantComponent} from '@shopify/hydrogen/storefront-api-types';
+import {BundledVariants} from '~/components/BundledVariants';
 
 export const meta: Route.MetaFunction = ({data}) => {
   return [
@@ -104,9 +106,12 @@ export default function Product() {
 
   const {title, descriptionHtml} = product;
 
+  const isBundle = Boolean(product.isBundle?.requiresComponents);
+  const bundledVariants = isBundle ? product.isBundle?.components.nodes : null;
+
   return (
     <div className="product">
-      <ProductImage image={selectedVariant?.image} />
+      <ProductImage image={selectedVariant?.image} isBundle={isBundle} />
       <div className="product-main">
         <h1>{title}</h1>
         <ProductPrice
@@ -117,6 +122,7 @@ export default function Product() {
         <ProductForm
           productOptions={productOptions}
           selectedVariant={selectedVariant}
+          isBundle={isBundle}
         />
         <br />
         <br />
@@ -126,6 +132,14 @@ export default function Product() {
         <br />
         <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
         <br />
+        {isBundle && (
+          <div>
+            <h4>Bundled Products</h4>
+            <BundledVariants
+              variants={bundledVariants as ProductVariantComponent[]}
+            />
+          </div>
+        )}
       </div>
       <Analytics.ProductView
         data={{
@@ -180,6 +194,28 @@ const PRODUCT_VARIANT_FRAGMENT = `#graphql
       amount
       currencyCode
     }
+    requiresComponents
+    components(first: 10) {
+      nodes {
+        productVariant {
+          id
+          title
+          product {
+            handle
+          }
+        }
+        quantity
+      }
+    }
+    groupedBy(first: 10) {
+      nodes {
+        id
+        title
+        product {
+          handle
+        }
+      }
+    }
   }
 ` as const;
 
@@ -216,6 +252,25 @@ const PRODUCT_FRAGMENT = `#graphql
     adjacentVariants (selectedOptions: $selectedOptions) {
       ...ProductVariant
     }
+    # Check if the product is a bundle
+    isBundle: selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, selectedOptions: { name: "", value: ""}) {
+      ...on ProductVariant {
+        requiresComponents
+        components(first: 100) {
+           nodes {
+              productVariant {
+                ...ProductVariant
+              }
+              quantity
+           }
+        }
+        groupedBy(first: 100) {
+          nodes {
+              id
+            }
+          }
+        }
+    }
     seo {
       description
       title
~~~

### Step 6: Update the collections fragment to query for bundles

Like the previous step, use the `requiresComponents` field to detect if the product item is a bundle.

#### File: /app/routes/collections.$handle.tsx

~~~diff
@@ -120,10 +120,16 @@ const PRODUCT_ITEM_FRAGMENT = `#graphql
         ...MoneyProductItem
       }
     }
+    # Check if the product is a bundle
+    isBundle: selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, selectedOptions: { name: "", value: ""}) {
+      ...on ProductVariant {
+        requiresComponents
+      }
+    }
   }
 ` as const;
 
-// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
+// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/collection
 const COLLECTION_QUERY = `#graphql
   ${PRODUCT_ITEM_FRAGMENT}
   query Collection(
~~~

### Step 7: Update the cart fragment to query for bundles

Use the `requiresComponents` field to determine if a cart line item is a bundle.

#### File: /app/lib/fragments.ts

~~~diff
@@ -52,6 +52,19 @@ export const CART_QUERY_FRAGMENT = `#graphql
           name
           value
         }
+        requiresComponents
+        components(first: 10) {
+          nodes {
+            productVariant {
+              id
+              title
+              product {
+                handle
+              }
+            }
+            quantity
+          }
+        }
       }
     }
   }
@@ -102,6 +115,28 @@ export const CART_QUERY_FRAGMENT = `#graphql
           name
           value
         }
+        requiresComponents
+        components(first: 10) {
+          nodes {
+            productVariant {
+              id
+              title
+              product {
+                handle
+              }
+            }
+            quantity
+          }
+        }
+        groupedBy(first: 10) {
+          nodes {
+            id
+            title
+            product {
+              handle
+            }
+          }
+        }
       }
     }
   }
~~~

### Step 8: Conditionally render the BundleBadge in cart line items

If a product is a bundle, show the `BundleBadge` component in the cart line item.

#### File: /app/components/CartLineItem.tsx

~~~diff
@@ -6,6 +6,7 @@ import {Link} from 'react-router';
 import {ProductPrice} from './ProductPrice';
 import {useAside} from './Aside';
 import type {CartApiQueryFragment} from 'storefrontapi.generated';
+import {BundleBadge} from '~/components/BundleBadge';
 
 type CartLine = OptimisticCartLine<CartApiQueryFragment>;
 
@@ -24,6 +25,7 @@ export function CartLineItem({
   const {product, title, image, selectedOptions} = merchandise;
   const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
   const {close} = useAside();
+  const isBundle = Boolean(line.merchandise.requiresComponents);
 
   return (
     <li key={id} className="cart-line">
@@ -38,8 +40,9 @@ export function CartLineItem({
         />
       )}
 
-      <div>
+      <div style={{display: 'flex', flexDirection: 'column', width: '100%'}}>
         <Link
+          style={{position: 'relative'}}
           prefetch="intent"
           to={lineItemUrl}
           onClick={() => {
@@ -48,9 +51,10 @@ export function CartLineItem({
             }
           }}
         >
-          <p>
+          <p style={{maxWidth: '60%'}}>
             <strong>{product.title}</strong>
           </p>
+          {isBundle ? <BundleBadge /> : null}
         </Link>
         <ProductPrice price={line?.cost?.totalAmount} />
         <ul>
~~~

### Step 9: Conditionally render "Add bundle to cart" in ProductForm

If a product is a bundle, update the text of the product button.

#### File: /app/components/ProductForm.tsx

~~~diff
@@ -11,9 +11,11 @@ import type {ProductFragment} from 'storefrontapi.generated';
 export function ProductForm({
   productOptions,
   selectedVariant,
+  isBundle,
 }: {
   productOptions: MappedProductOptions[];
   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
+  isBundle: boolean;
 }) {
   const navigate = useNavigate();
   const {open} = useAside();
@@ -118,7 +120,11 @@ export function ProductForm({
             : []
         }
       >
-        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
+        {selectedVariant?.availableForSale
+          ? isBundle
+            ? 'Add bundle to cart'
+            : 'Add to cart'
+          : 'Sold out'}
       </AddToCartButton>
     </div>
   );
~~~

### Step 10: Conditionally render the BundleBadge in ProductImage

If a product is a bundle, show the `BundleBadge` component in the `ProductImage` component.

#### File: /app/components/ProductImage.tsx

~~~diff
@@ -1,10 +1,13 @@
 import type {ProductVariantFragment} from 'storefrontapi.generated';
 import {Image} from '@shopify/hydrogen';
+import {BundleBadge} from './BundleBadge';
 
 export function ProductImage({
   image,
+  isBundle = false,
 }: {
   image: ProductVariantFragment['image'];
+  isBundle: boolean;
 }) {
   if (!image) {
     return <div className="product-image" />;
@@ -18,6 +21,7 @@ export function ProductImage({
         key={image.id}
         sizes="(min-width: 45em) 50vw, 100vw"
       />
+      {isBundle ? <BundleBadge /> : null}
     </div>
   );
 }
~~~

### Step 11: Conditionally render the BundleBadge in ProductItem

If a product is a bundle, show the `BundleBadge` component in the `ProductItem` component.

#### File: /app/components/ProductItem.tsx

~~~diff
@@ -1,24 +1,19 @@
 import {Link} from 'react-router';
 import {Image, Money} from '@shopify/hydrogen';
-import type {
-  ProductItemFragment,
-  CollectionItemFragment,
-  RecommendedProductFragment,
-} from 'storefrontapi.generated';
+import type {ProductItemFragment} from 'storefrontapi.generated';
 import {useVariantUrl} from '~/lib/variants';
+import {BundleBadge} from '~/components/BundleBadge';
 
 export function ProductItem({
   product,
   loading,
 }: {
-  product:
-    | CollectionItemFragment
-    | ProductItemFragment
-    | RecommendedProductFragment;
+  product: ProductItemFragment;
   loading?: 'eager' | 'lazy';
 }) {
   const variantUrl = useVariantUrl(product.handle);
-  const image = product.featuredImage;
+  const isBundle = product?.isBundle?.requiresComponents;
+
   return (
     <Link
       className="product-item"
@@ -26,19 +21,22 @@ export function ProductItem({
       prefetch="intent"
       to={variantUrl}
     >
-      {image && (
-        <Image
-          alt={image.altText || product.title}
-          aspectRatio="1/1"
-          data={image}
-          loading={loading}
-          sizes="(min-width: 45em) 400px, 100vw"
-        />
-      )}
-      <h4>{product.title}</h4>
-      <small>
-        <Money data={product.priceRange.minVariantPrice} />
-      </small>
+      <div style={{position: 'relative'}}>
+        {product.featuredImage && (
+          <Image
+            alt={product.featuredImage.altText || product.title}
+            aspectRatio="1/1"
+            data={product.featuredImage}
+            loading={loading}
+            sizes="(min-width: 45em) 400px, 100vw"
+          />
+        )}
+        <h4>{product.title}</h4>
+        <small>
+          <Money data={product.priceRange.minVariantPrice} />
+        </small>
+        {isBundle && <BundleBadge />}
+      </div>
     </Link>
   );
 }
~~~

### Step 12: Add a product-image class to the app stylesheet

Make sure the bundle badge is positioned relative to the product image.

#### File: /app/styles/app.css

~~~diff
@@ -435,6 +435,10 @@ button.reset:hover:not(:has(> *)) {
   margin-top: 0;
 }
 
+.product-image {
+  position: relative;
+}
+
 .product-image img {
   height: auto;
   width: 100%;
~~~

</recipe_implementation>