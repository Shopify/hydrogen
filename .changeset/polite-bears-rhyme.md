---
'@shopify/hydrogen': patch
---

# Deprecation Notice: VariantSelector

`VariantSelector` is deprecated because it does not supports 2k variants or combined listing products. Use `getProductOptions` for a streamlined migration to a modern scalable product form.

1. Update the SFAPI product query to request the new required fields `encodedVariantExistence` and `encodedVariantAvailability`. This will allow the product form to determine which variants are available for selection.

```diff
const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
+    encodedVariantExistence
+    encodedVariantAvailability
    options {
      name
      optionValues {
        name
+        firstSelectableVariant {
+          ...ProductVariant
+        }
+        swatch {
+          color
+          image {
+            previewImage {
+              url
+            }
+          }
+        }
      }
    }
-    selectedVariant: selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+      ...ProductVariant
+    }
+    adjacentVariants (selectedOptions: $selectedOptions) {
+      ...ProductVariant
+    }
-    variants(first: 1) {
-      nodes {
-        ...ProductVariant
-      }
-    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
```

2. Remove the `VARIANTS_QUERY` and related logic from `loadDeferredData`, as querying all variants is no longer necessary. Simplifies the function to return an empty object.

```diff
function loadDeferredData({context, params}: LoaderFunctionArgs) {
+  // Put any API calls that is not critical to be available on first page render
+  // For example: product reviews, product recommendations, social feeds.
-  // In order to show which variants are available in the UI, we need to query
-  // all of them. But there might be a *lot*, so instead separate the variants
-  // into it's own separate query that is deferred. So there's a brief moment
-  // where variant options might show as available when they're not, but after
-  // this deferred query resolves, the UI will update.
-  const variants = context.storefront
-    .query(VARIANTS_QUERY, {
-      variables: {handle: params.handle!},
-    })
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });

+  return {}
-  return {
-    variants,
-  };
}
```

3. Update the `Product` component to use `getAdjacentAndFirstAvailableVariants` for determining the selected variant, improving handling of adjacent and available variants.

```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getAdjacentAndFirstAvailableVariants,
} from '@shopify/hydrogen';

export default function Product() {
+  const {product} = useLoaderData<typeof loader>();
-  const {product, variants} = useLoaderData<typeof loader>();

+  // Optimistically selects a variant with given available variant information
+  const selectedVariant = useOptimisticVariant(
+    product.selectedOrFirstAvailableVariant,
+    getAdjacentAndFirstAvailableVariants(product),
+  );
-  const selectedVariant = useOptimisticVariant(
-    product.selectedVariant,
-    variants,
-  );
```

4. Automatically update the URL with search parameters based on the selected product variant's options when no search parameters are present, ensuring the URL reflects the current selection without triggering navigation.

```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
+  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

+  // Sets the search param to the selected variant without navigation
+  // only when no search params are set in the url
+  useEffect(() => {
+    const searchParams = new URLSearchParams(
+      mapSelectedProductOptionToObject(
+        selectedVariant.selectedOptions || [],
+      ),
+    );

+    if (window.location.search === '' && searchParams.toString() !== '') {
+      window.history.replaceState(
+        {},
+        '',
+        `${location.pathname}?${searchParams.toString()}`,
+      );
+    }
+  }, [
+    JSON.stringify(selectedVariant.selectedOptions),
+  ]);
```

5. Retrieve the product options array using `getProductOptions`, enabling efficient handling of product variants and their associated options.

```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useEffect(() => {
    // ...
  }, [
    JSON.stringify(selectedVariant.selectedOptions),
  ]);

+  // Get the product options array
+  const productOptions = getProductOptions({
+    ...product,
+    selectedOrFirstAvailableVariant: selectedVariant,
+  });
```

6. Remove `Await` and `Suspense` from `ProductForm` as there are no longer any asynchronous queries to wait for, simplifying the component structure.

```diff
export default function Product() {

  ...

  return (
    ...
+        <ProductForm
+          productOptions={productOptions}
+          selectedVariant={selectedVariant}
+        />
-        <Suspense
-          fallback={
-            <ProductForm
-              product={product}
-              selectedVariant={selectedVariant}
-              variants={[]}
-            />
-          }
-        >
-          <Await
-            errorElement="There was a problem loading product variants"
-            resolve={variants}
-          >
-            {(data) => (
-              <ProductForm
-                product={product}
-                selectedVariant={selectedVariant}
-                variants={data?.product?.variants.nodes || []}
-              />
-            )}
-          </Await>
-        </Suspense>
```

7. Refactor `ProductForm` to handle combined listing products and variants efficiently. It uses links for different product URLs and buttons for variant updates, improving SEO and user experience.

```tsx
import {Link, useNavigate} from '@remix-run/react';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  return (
    <div className="product-form">
      {productOptions.map((option) => (
        <div className="product-options" key={option.name}>
          <h5>{option.name}</h5>
          <div className="product-options-grid">
            {option.optionValues.map((value) => {
              const {
                name,
                handle,
                variantUriQuery,
                selected,
                available,
                exists,
                isDifferentProduct,
                swatch,
              } = value;

              if (isDifferentProduct) {
                // SEO
                // When the variant is a combined listing child product
                // that leads to a different URL, we need to render it
                // as an anchor tag
                return (
                  <Link
                    className="product-options-item"
                    key={option.name + name}
                    prefetch="intent"
                    preventScrollReset
                    replace
                    to={`/products/${handle}?${variantUriQuery}`}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </Link>
                );
              } else {
                // SEO
                // When the variant is an update to the search param,
                // render it as a button with JavaScript navigating to
                // the variant so that SEO bots do not index these as
                // duplicated links
                return (
                  <button
                    type="button"
                    className={`product-options-item${
                      exists && !selected ? ' link' : ''
                    }`}
                    key={option.name + name}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        navigate(`?${variantUriQuery}`, {
                          replace: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              }
            })}
          </div>
          <br />
        </div>
      ))}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
```

8. Make `useVariantUrl` and `getVariantUrl` functions more flexible by allowing `selectedOptions` to be optional. This ensures compatibility with cases where no options are provided.

```diff
export function useVariantUrl(
  handle: string,
-  selectedOptions: SelectedOption[],
+  selectedOptions?: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}
export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  pathname: string;
  searchParams: URLSearchParams;
-  selectedOptions: SelectedOption[];
+  selectedOptions?: SelectedOption[],
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;
  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

-  selectedOptions.forEach((option) => {
+  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });
```

9. Remove unnecessary variant queries and references in `routes/collections.$handle.tsx`, simplifying the code by relying on the product route to fetch the first available variant.

```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

10. Simplify the `ProductItem` component by removing variant-specific queries and logic. The `useVariantUrl` function now generates URLs without relying on variant options, reducing complexity.

```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

11. Replace `variants(first: 1)` with `selectedOrFirstAvailableVariant` in GraphQL fragments to directly fetch the most relevant variant, improving query efficiency and clarity.

```diff
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
     }
-    }
  }
` as const;
```

```diff
const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
     }
-    }
  }
```

12. Refactor `SearchResultsProducts` to use `selectedOrFirstAvailableVariant` for fetching product price and image, simplifying the logic and improving performance.

```diff
function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });

+            const price = product?.selectedOrFirstAvailableVariant?.price;
+            const image = product?.selectedOrFirstAvailableVariant?.image;

            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
-                  {product.variants.nodes[0].image && (
+                  {image && (
                    <Image
-                      data={product.variants.nodes[0].image}
+                      data={image}
                      alt={product.title}
                      width={50}
                    />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>
-                      <Money data={product.variants.nodes[0].price} />
+                      {price &&
+                        <Money data={price} />
+                      }
                    </small>
                  </div>
                </Link>
              </div>
            );
          });
```

13. Update `SearchResultsPredictive` to use `selectedOrFirstAvailableVariant` for fetching product price and image, ensuring accurate and efficient data retrieval.

```diff
function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5>Products</h5>
      <ul>
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          });

+          const price = product?.selectedOrFirstAvailableVariant?.price;
-          const image = product?.variants?.nodes?.[0].image;
+          const image = product?.selectedOrFirstAvailableVariant?.image;
          return (
            <li className="predictive-search-result-item" key={product.id}>
              <Link to={productUrl} onClick={closeSearch}>
                {image && (
                  <Image
                    alt={image.altText ?? ''}
                    src={image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <p>{product.title}</p>
                  <small>
-                    {product?.variants?.nodes?.[0].price && (
+                    {price && (
-                      <Money data={product.variants.nodes[0].price} />
+                      <Money data={price} />
                    )}
                  </small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```
