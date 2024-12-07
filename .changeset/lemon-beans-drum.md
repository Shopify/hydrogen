---
'skeleton': patch
---

Optional updates for the product route and product form to handle combined listing and 2000 variant limit.

1. Update your SFAPI product query to bring in the new query fields:

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

2. Update `loadDeferredData` function. We no longer need to load in all the variants. You can also remove `VARIANTS_QUERY` variable.

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

3. Update the `Product` component to use the new data fields.

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

4. Handle missing search query param in url from selecting a first variant

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

5. Get the product options array using `getProductOptions`

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

6. Remove the `Await` and `Suspense` from the `ProductForm`. We no longer have any queries that we need to wait for.

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

7. Update the `ProductForm` component.

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
                // that leads to a different url, we need to render it
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
                // render it as a button with javascript navigating to
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

8. Update `app.css`

```diff
+  /*
+  * --------------------------------------------------
+  * Non anchor links
+  * --------------------------------------------------
+  */
+  .link:hover {
+    text-decoration: underline;
+    cursor: pointer;
+  }

...

-  .product-options-item {
+  .product-options-item,
+  .product-options-item:disabled {
+    padding: 0.25rem 0.5rem;
+    background-color: transparent;
+    font-size: 1rem;
+    font-family: inherit;
+  }

+  .product-option-label-swatch {
+    width: 1.25rem;
+    height: 1.25rem;
+    margin: 0.25rem 0;
+  }

+  .product-option-label-swatch img {
+    width: 100%;
+  }
```
