# @shopify/hydrogen

## 2025.4.1

### Patch Changes

- Add a `buyerIdentity` parameter to `createHydrogenContext` and `createCartHandler`. This buyer identity will be used as the default buyer identity for all new cart creations: ([#2927](https://github.com/Shopify/hydrogen/pull/2927)) by [@blittle](https://github.com/blittle)

  ```ts
  const hydrogenContext = createHydrogenContext({
    // ...
    buyerIdentity: {
      companyLocationId: '...',
    },
  });
  ```

## 2025.4.0

### Patch Changes

- Update SFAPI and CAAPI versions to 2025.04 ([#2886](https://github.com/Shopify/hydrogen/pull/2886)) by [@juanpprieto](https://github.com/juanpprieto)

- Switch to an evergreen URL for Perfkit. Users will no longer need to update Hydrogen to get the newest features and bugfixes. ([#2895](https://github.com/Shopify/hydrogen/pull/2895)) by [@krzksz](https://github.com/krzksz)

- Updated dependencies [[`af23e710`](https://github.com/Shopify/hydrogen/commit/af23e710dac83bb57498d9c2ef1d8bcf9df55d34)]:
  - @shopify/hydrogen-react@2025.4.0

## 2025.1.4

### Patch Changes

- Fix the customer account implementation to clear all session data on logout. Previously we would only clear customer account credentials on logout. This change also clears any custom data in the session as well. You can opt out and keep custom data in the session by passing the `keepSession` option to logout: ([#2843](https://github.com/Shopify/hydrogen/pull/2843)) by [@blittle](https://github.com/blittle)

  ```js
  export async function action({context}: ActionFunctionArgs) {
    return context.customerAccount.logout({
      keepSession: true
    });
  }
  ```

- Add support for cartDeliveryAddressesAdd, cartDeliveryAddressesRemove and cartDeliveryAddressesUpdate mutations ([#2850](https://github.com/Shopify/hydrogen/pull/2850)) by [@juanpprieto](https://github.com/juanpprieto)

- Deprecation Notice: VariantSelector ([#2837](https://github.com/Shopify/hydrogen/pull/2837)) by [@juanpprieto](https://github.com/juanpprieto)

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

## 2025.1.3

### Patch Changes

- Bump Remix to 2.16.1 and vite to 6.2.0 ([#2784](https://github.com/Shopify/hydrogen/pull/2784)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Support for the Remix future flag `v3_routeConfig`. ([#2722](https://github.com/Shopify/hydrogen/pull/2722)) by [@seanparsons](https://github.com/seanparsons)

  Please refer to the Remix documentation for more details on `v3_routeConfig` future flag: [https://remix.run/docs/en/main/start/future-flags#v3_routeconfig](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)

  1. Add the following npm package dev dependencies:

     ```diff
       "devDependencies": {
         "@remix-run/dev": "^2.16.1",
     +    "@remix-run/fs-routes": "^2.16.1",
     +    "@remix-run/route-config": "^2.16.1",
     ```

  1. If you have `export function Layout` in your `root.tsx`, move this export into its own file. For example:

     ```ts
     // /app/layout.tsx
     export default function Layout() {
       const nonce = useNonce();
       const data = useRouteLoaderData<RootLoader>('root');

       return (
         <html lang="en">
         ...
       );
     }
     ```

  1. Create a `routes.ts` file.

     ```ts
     import {flatRoutes} from '@remix-run/fs-routes';
     import {layout, type RouteConfig} from '@remix-run/route-config';
     import {hydrogenRoutes} from '@shopify/hydrogen';

     export default hydrogenRoutes([
       // Your entire app reading from routes folder using Layout from layout.tsx
       layout('./layout.tsx', await flatRoutes()),
     ]) satisfies RouteConfig;
     ```

  1. Update your `vite.config.ts`.

     ```diff
     export default defineConfig({
       plugins: [
         hydrogen(),
         oxygen(),
         remix({
     -      presets: [hydrogen.preset()],
     +      presets: [hydrogen.v3preset()],
     ```

- Updated dependencies [[`0425e50d`](https://github.com/Shopify/hydrogen/commit/0425e50dafe2f42326cba67076e5fcea2905e885)]:
  - @shopify/hydrogen-react@2025.1.3

## 2025.1.2

### Patch Changes

- Update cli dependencies ([#2766](https://github.com/Shopify/hydrogen/pull/2766)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`128dfcd6`](https://github.com/Shopify/hydrogen/commit/128dfcd6b254a7465d93be49d3bcbff5251e5ffc)]:
  - @shopify/hydrogen-react@2025.1.2

## 2025.1.1

### Patch Changes

- Update `getProductOptions` to handle divergent product options. ([#2747](https://github.com/Shopify/hydrogen/pull/2747)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Added the ability to optionally provide `language` data to `createCustomerAccountClient`, and automatically pass it down to it from `createHydrogenContext`. ([#2746](https://github.com/Shopify/hydrogen/pull/2746)) by [@ruggishop](https://github.com/ruggishop)

  If present, the provided `language` will be used to set the `uilocales` property in the Customer Account API request.

  ```ts
  // Optional: provide language data to the constructor
  const customerAccount = createCustomerAccountClient({
    // ...
    language,
  });
  ```

  Calls to `login()` will use the provided `language` without having to pass it explicitly via `uiLocales`; however, if the `login()` method is
  already using its `uilocales` property, the `language` parameter coming from the context/constructor will be ignored. If nothing is explicitly passed, `login()` will default to `context.i18n.language`.

  ```ts
  export async function loader({request, context}: LoaderFunctionArgs) {
    return context.customerAccount.login({
      uiLocales: 'FR', // will be used instead of the one coming from the context
    });
  }
  ```

- Upgrade eslint to version 9 and unify eslint config across all packages (with the exception of the skeleton, which still keeps its own config) ([#2716](https://github.com/Shopify/hydrogen/pull/2716)) by [@liady](https://github.com/liady)

- Bump remix version ([#2740](https://github.com/Shopify/hydrogen/pull/2740)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Turn on Remix `v3_singleFetch` future flag ([#2708](https://github.com/Shopify/hydrogen/pull/2708)) by [@wizardlyhel](https://github.com/wizardlyhel)

- B2B methods and props are now stable. Warnings are in place for unstable usages and will be removed completely in the next major version. ([#2736](https://github.com/Shopify/hydrogen/pull/2736)) by [@dustinfirman](https://github.com/dustinfirman)

  1. Search for anywhere using `UNSTABLE_getBuyer` and `UNSTABLE_setBuyer` is update accordingly.

     ```diff
     - customerAccount.UNSTABLE_getBuyer();
     + customerAccount.getBuyer()

     - customerAccount.UNSTABLE_setBuyer({
     + customerAccount.setBuyer({
         companyLocationId,
       });
     ```

  2. Update `createHydrogenContext` to remove the `unstableB2b` option

     ```diff
       const hydrogenContext = createHydrogenContext({
         env,
         request,
         cache,
         waitUntil,
         session,
         i18n: {language: 'EN', country: 'US'},
     -    customerAccount: {
     -      unstableB2b: true,
     -    },
         cart: {
           queryFragment: CART_QUERY_FRAGMENT,
         },
       });
     ```

- Updated dependencies [[`3af2e453`](https://github.com/Shopify/hydrogen/commit/3af2e4534eafe1467f70a35885a2fa2ef7724fa8), [`cd65685c`](https://github.com/Shopify/hydrogen/commit/cd65685c1036233faaead0330f25183900b102a7)]:
  - @shopify/hydrogen-react@2025.1.1

## 2025.1.0

### Patch Changes

- Bump vite, Remix versions and tailwind v4 alpha to beta ([#2696](https://github.com/Shopify/hydrogen/pull/2696)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Remove deprecated `customerAccountUrl` ([#2730](https://github.com/Shopify/hydrogen/pull/2730)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix `getProductOptions` crashing when one of variants returns a null `firstSelectableVariant`. ([#2704](https://github.com/Shopify/hydrogen/pull/2704)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Bump SFAPI to 2025-01 ([#2715](https://github.com/Shopify/hydrogen/pull/2715)) by [@rbshop](https://github.com/rbshop)

- Updated dependencies [[`fdab06f5`](https://github.com/Shopify/hydrogen/commit/fdab06f5d34076b526d406698bdf6fca6787660b), [`650d57b3`](https://github.com/Shopify/hydrogen/commit/650d57b3e07125661e23900e73c0bb3027ddbcde), [`064de138`](https://github.com/Shopify/hydrogen/commit/064de13890c68cabb1c3fdbe7f77409a0cf1c384), [`08b7fa5b`](https://github.com/Shopify/hydrogen/commit/08b7fa5bb99632e4707d0dec4e06f6d16b2816d0)]:
  - @shopify/hydrogen-react@2025.1.0

## 2024.10.1

### Patch Changes

- Added namespace support to prevent conflicts when using multiple Pagination components: ([#2649](https://github.com/Shopify/hydrogen/pull/2649)) by [@scottdixon](https://github.com/scottdixon)

  - New optional `namespace` prop for the `<Pagination/>` component
  - New optional `namespace` option for `getPaginationVariables()` utility
  - When specified, pagination URL parameters are prefixed with the namespace (e.g., `products_cursor` instead of `cursor`)
  - Maintains backwards compatibility when no namespace is provided

- Introduce `getProductOptions`, `getAdjacentAndFirstAvailableVariants`, `useSelectedOptionInUrlParam`, and `mapSelectedProductOptionToObject` to support combined listing products and products with 2000 variants limit. ([#2659](https://github.com/Shopify/hydrogen/pull/2659)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Add params to override the login and authorize paths: ([#2648](https://github.com/Shopify/hydrogen/pull/2648)) by [@blittle](https://github.com/blittle)

  ```ts
  const hydrogenContext = createHydrogenContext({
    // ...
    customerAccount: {
      loginPath = '/account/login',
      authorizePath = '/account/authorize',
      defaultRedirectPath = '/account',
    },
  });
  ```

- Add `selectedVariant` prop to the `VariantSelector` to use for the initial state if no URL parameters are set ([#2643](https://github.com/Shopify/hydrogen/pull/2643)) by [@scottdixon](https://github.com/scottdixon)

- Updated dependencies [[`a57d5267`](https://github.com/Shopify/hydrogen/commit/a57d5267daa2f22fe1a426fb9f62c242957f95b6)]:
  - @shopify/hydrogen-react@2024.10.1

## 2024.10.0

### Patch Changes

- Add optional headers param for logout redirect ([#2602](https://github.com/Shopify/hydrogen/pull/2602)) by [@coryagami](https://github.com/coryagami)

- Stabilize `getSitemap`, `getSitemapIndex` and implement on skeleton ([#2589](https://github.com/Shopify/hydrogen/pull/2589)) by [@juanpprieto](https://github.com/juanpprieto)

  1. Update the `getSitemapIndex` at `/app/routes/[sitemap.xml].tsx`

  ```diff
  - import {unstable__getSitemapIndex as getSitemapIndex} from '@shopify/hydrogen';
  + import {getSitemapIndex} from '@shopify/hydrogen';
  ```

  2. Update the `getSitemap` at `/app/routes/sitemap.$type.$page[.xml].tsx`

  ```diff
  - import {unstable__getSitemap as getSitemap} from '@shopify/hydrogen';
  + import {getSitemap} from '@shopify/hydrogen';
  ```

  For a reference implementation please see the skeleton template sitemap routes

- Update `<ProductPrice>` to remove deprecated code usage for `priceV2` and `compareAtPriceV2`. Remove export for `getCustomerPrivacy`. ([#2601](https://github.com/Shopify/hydrogen/pull/2601)) by [@wizardlyhel](https://github.com/wizardlyhel)

- [**Breaking change**] ([#2588](https://github.com/Shopify/hydrogen/pull/2588)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Set up Customer Privacy without the Shopify's cookie banner by default.

  If you are using Shopify's cookie banner to handle user consent in your app, you need to set `withPrivacyBanner: true` to the consent config. Without this update, the Shopify cookie banner will not appear.

  ```diff
    return defer({
      ...
      consent: {
        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
        storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  +      withPrivacyBanner: true,
        // localize the privacy banner
        country: args.context.storefront.i18n.country,
        language: args.context.storefront.i18n.language,
      },
    });
  ```

- Update to 2024-10 SFAPI ([#2570](https://github.com/Shopify/hydrogen/pull/2570)) by [@wizardlyhel](https://github.com/wizardlyhel)

- [**Breaking change**] ([#2546](https://github.com/Shopify/hydrogen/pull/2546)) by [@frandiox](https://github.com/frandiox)

  Update `createWithCache` to make it harder to accidentally cache undesired results. `request` is now mandatory prop when initializing `createWithCache`.

  ```diff
  // server.ts
  export default {
    async fetch(
      request: Request,
      env: Env,
      executionContext: ExecutionContext,
    ): Promise<Response> {
      try {
        // ...
  -     const withCache = createWithCache({cache, waitUntil});
  +     const withCache = createWithCache({cache, waitUntil, request});
  ```

  `createWithCache` now returns an object with two utility functions: `withCache.run` and `withCache.fetch`. Both have a new prop `shouldCacheResult` that must be defined.

  The original `withCache` callback function is now `withCache.run`. This is useful to run _multiple_ fetch calls and merge their responses, or run any arbitrary code. It caches anything you return, but you can throw if you don't want to cache anything.

  ```diff
    const withCache = createWithCache({cache, waitUntil, request});

    const fetchMyCMS = (query) => {
  -    return withCache(['my-cms', query], CacheLong(), async (params) => {
  +    return withCache.run({
  +      cacheKey: ['my-cms', query],
  +      cacheStrategy: CacheLong(),
  +      // Cache if there are no data errors or a specific data that make this result not suited for caching
  +      shouldCacheResult: (result) => !result?.errors,
  +    }, async(params) => {
        const response = await fetch('my-cms.com/api', {
          method: 'POST',
          body: query,
        });
        if (!response.ok) throw new Error(response.statusText);
        const {data, error} = await response.json();
        if (error || !data) throw new Error(error ?? 'Missing data');
        params.addDebugData({displayName: 'My CMS query', response});
        return data;
      });
    };
  ```

  New `withCache.fetch` is for caching simple fetch requests. This method caches the responses if they are OK responses, and you can pass `shouldCacheResponse`, `cacheKey`, etc. to modify behavior. `data` is the consumed body of the response (we need to consume to cache it).

  ```ts
  const withCache = createWithCache({cache, waitUntil, request});

  const {data, response} = await withCache.fetch<{data: T; error: string}>(
    'my-cms.com/api',
    {
      method: 'POST',
      headers: {'Content-type': 'application/json'},
      body,
    },
    {
      cacheStrategy: CacheLong(),
      // Cache if there are no data errors or a specific data that make this result not suited for caching
      shouldCacheResponse: (result) => !result?.error,
      cacheKey: ['my-cms', body],
      displayName: 'My CMS query',
    },
  );
  ```

- [**Breaking change**] ([#2585](https://github.com/Shopify/hydrogen/pull/2585)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Deprecate usages of `product.options.values` and use `product.options.optionValues` instead.

  1. Update your product graphql query to use the new `optionValues` field.

  ```diff
    const PRODUCT_FRAGMENT = `#graphql
      fragment Product on Product {
        id
        title
        options {
          name
  -        values
  +        optionValues {
  +          name
  +        }
        }
  ```

  2. Update your `<VariantSelector>` to use the new `optionValues` field.

  ```diff
    <VariantSelector
      handle={product.handle}
  -    options={product.options.filter((option) => option.values.length > 1)}
  +    options={product.options.filter((option) => option.optionValues.length > 1)}
      variants={variants}
    >
  ```

- Add utility functions `decodeEncodedVariant` and `isOptionValueCombinationInEncodedVariant` for parsing `product.encodedVariantExistence` and `product.encodedVariantAvailability` fields. ([#2425](https://github.com/Shopify/hydrogen/pull/2425)) by [@lhoffbeck](https://github.com/lhoffbeck)

- [**Breaking change**] ([#2572](https://github.com/Shopify/hydrogen/pull/2572)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Update all cart mutation methods from `createCartHandler` to return cart warnings.

  As of API version 2024-10, inventory errors about stock levels will no longer be included in the `userErrors` of cart mutations. Inventory errors will now be available in a new return field `warnings` and will contain explicit code values of `MERCHANDISE_NOT_ENOUGH_STOCK` or `MERCHANDISE_OUT_OF_STOCK`. Reference: https://shopify.dev/changelog/cart-warnings-in-storefront-api-cart

- Updated dependencies [[`8c89f298`](https://github.com/Shopify/hydrogen/commit/8c89f298a8d9084ee510fb4d0d17766ec43c249c), [`84a66b1e`](https://github.com/Shopify/hydrogen/commit/84a66b1e9d07bd6d6a10e5379ad3350b6bbecde9), [`76cd4f9b`](https://github.com/Shopify/hydrogen/commit/76cd4f9ba3dd8eff4433d72f4422c06a7d567537)]:
  - @shopify/hydrogen-react@2024.10.0

## 2024.7.9

### Patch Changes

- Fix provided canTrack function being override by ShopifyAnalytics ([#2596](https://github.com/Shopify/hydrogen/pull/2596)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix analytics provider breaking after hitting a 404 page ([#2590](https://github.com/Shopify/hydrogen/pull/2590)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`229d4aa0`](https://github.com/Shopify/hydrogen/commit/229d4aa039bf44ced34122c273254d8961a3ed0c)]:
  - @shopify/hydrogen-react@2024.7.6

## 2024.7.8

### Patch Changes

- Update customer account buyer authentication exchange ([#2437](https://github.com/Shopify/hydrogen/pull/2437)) by [@s-lee-kwong](https://github.com/s-lee-kwong)

- Updated dependencies [[`bb5b0979`](https://github.com/Shopify/hydrogen/commit/bb5b0979ddffb007111885b3a9b7aa490a3c6882)]:
  - @shopify/hydrogen-react@2024.7.5

## 2024.7.7

### Patch Changes

- Fix Shopify.customerPrivacy.setTrackingConsent override not working properly ([#2538](https://github.com/Shopify/hydrogen/pull/2538)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 2024.7.6

### Patch Changes

- Emit a document event `shopifyCustomerPrivacyApiLoaded` when Customer Privacy API is ready and fix analytics events sending to Shopify. ([#2528](https://github.com/Shopify/hydrogen/pull/2528)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`d0ff37a9`](https://github.com/Shopify/hydrogen/commit/d0ff37a995bb64598930f8aa53f2612f3b1ea476)]:
  - @shopify/hydrogen-react@2024.7.4

## 2024.7.5

### Patch Changes

- Prevent CSP nonces from persisting between requests ([#2500](https://github.com/Shopify/hydrogen/pull/2500)) by [@juanpprieto](https://github.com/juanpprieto)

- useOptimisticCart: optimistically calculate totalQuantity ([#2459](https://github.com/Shopify/hydrogen/pull/2459)) by [@scottdixon](https://github.com/scottdixon)

- createCartHandler supplies updateGiftCardCodes method ([#2298](https://github.com/Shopify/hydrogen/pull/2298)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Introduce a new abstraction for generating sitemap index and child sitemaps. ([#2478](https://github.com/Shopify/hydrogen/pull/2478)) by [@blittle](https://github.com/blittle)

  See the [sitemap example](https://github.com/Shopify/hydrogen/tree/main/examples/sitemap) for how to use it and read the [docs](https://shopify.dev/docs/api/hydrogen/utilities/getSitemapIndex) for more information.

- Add localization support to consent privacy banner ([#2457](https://github.com/Shopify/hydrogen/pull/2457)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`ca0c7692`](https://github.com/Shopify/hydrogen/commit/ca0c76921ee873920d58112849cd0709bb990858), [`81f2b540`](https://github.com/Shopify/hydrogen/commit/81f2b540c42c55f36c70c63bce34a3e1626d9965)]:
  - @shopify/hydrogen-react@2024.7.3

## 2024.7.4

### Patch Changes

- Fix the `Script` component to not throw when using it for inline scripts with `dangerouslySetInnerHTML` ([#2428](https://github.com/Shopify/hydrogen/pull/2428)) by [@blittle](https://github.com/blittle)

## 2024.7.3

### Patch Changes

- Prevent sending analytics data to Shopify when Chrome-Lighthouse user agent is detected ([#2401](https://github.com/Shopify/hydrogen/pull/2401)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Create `createHydrogenContext` that combined `createStorefrontClient`, `createCustomerAccountClient` and `createCartHandler`. ([#2333](https://github.com/Shopify/hydrogen/pull/2333)) by [@michenly](https://github.com/michenly)

- Add a `waitForHydration` prop to the `Script` component to delay loading until after hydration. This fixes third-party scripts that modify the DOM and cause hydration errors. ([#2389](https://github.com/Shopify/hydrogen/pull/2389)) by [@blittle](https://github.com/blittle)

  Note: For security, `nonce` is not supported when using `waitForHydration`. Instead you need to add the domain of the script directly to your [Content Securitiy Policy directives](https://shopify.dev/docs/storefronts/headless/hydrogen/content-security-policy#step-3-customize-the-content-security-policy).

- Fix the `OptimisticCart` type to properly retain the generic of line items. The `OptimisticCartLine` type now takes a cart or cart line item generic. ([#2327](https://github.com/Shopify/hydrogen/pull/2327)) by [@blittle](https://github.com/blittle)

- Export `ShopAnalytics` type ([#2384](https://github.com/Shopify/hydrogen/pull/2384)) by [@Braedencraig](https://github.com/Braedencraig)

- Updated dependencies [[`cfbfc827`](https://github.com/Shopify/hydrogen/commit/cfbfc827e40e7425cf213a099eafb7a581b2885f), [`b09e9a4c`](https://github.com/Shopify/hydrogen/commit/b09e9a4ca7b931e48462c2d174ca9f67c37f1da2)]:
  - @shopify/hydrogen-react@2024.7.2

## 2024.7.2

### Patch Changes

- Fix subrequest profiler by removing the Layout export from virtual root. ([#2344](https://github.com/Shopify/hydrogen/pull/2344)) by [@michenly](https://github.com/michenly)

## 2024.7.1

### Patch Changes

- [**Breaking change**] ([#2137](https://github.com/Shopify/hydrogen/pull/2137)) by [@michenly](https://github.com/michenly)

  `customerAccount` no longer commit session automatically.

- [**Breaking change**] ([#2113](https://github.com/Shopify/hydrogen/pull/2113)) by [@blittle](https://github.com/blittle)

  Previously the `VariantSelector` component would filter out options that only had one value. This is undesireable for some apps. We've removed that filter, if you'd like to retain the existing functionality, simply filter the options prop before it is passed to the `VariantSelector` component:

  ```diff
   <VariantSelector
     handle={product.handle}
  +  options={product.options.filter((option) => option.values.length > 1)}
  -  options={product.options}
     variants={variants}>
   </VariantSelector>
  ```

  Fixes [#1198](https://github.com/Shopify/hydrogen/discussions/1198)

- Fix the types for optimistic cart ([#2132](https://github.com/Shopify/hydrogen/pull/2132)) by [@blittle](https://github.com/blittle)

- Improve the types for `useOptimisticCart()` ([#2269](https://github.com/Shopify/hydrogen/pull/2269)) by [@blittle](https://github.com/blittle)

- Fix a small rounding issue when checking stale-while-revalidate timing. ([#2220](https://github.com/Shopify/hydrogen/pull/2220)) by [@frandiox](https://github.com/frandiox)

- Update virtual route to use Layout component in the root file. ([#2292](https://github.com/Shopify/hydrogen/pull/2292)) by [@michenly](https://github.com/michenly)

- Add `sellingPlanId` support to `BuyNowButton`. ([#2254](https://github.com/Shopify/hydrogen/pull/2254)) by [@dvisockas](https://github.com/dvisockas)

- Fix customData from Analytics.Provider not being passed to page view events ([#2224](https://github.com/Shopify/hydrogen/pull/2224)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Auto cookie domain detection for customer privacy api and better error message for missing analytics fields ([#2256](https://github.com/Shopify/hydrogen/pull/2256)) by [@wizardlyhel](https://github.com/wizardlyhel)

- [**New Features**] ([#2183](https://github.com/Shopify/hydrogen/pull/2183)) by [@blittle](https://github.com/blittle)

  Add a `useOptimisticVariant` hook for optimistically rendering product variant changes. This makes switching product variants instantaneous. Example usage:

  ```tsx
  function Product() {
    const {product, variants} = useLoaderData<typeof loader>();

    // The selectedVariant optimistically changes during page
    // transitions with one of the preloaded product variants
    const selectedVariant = useOptimisticVariant(
      product.selectedVariant,
      variants,
    );

    return <ProductMain selectedVariant={selectedVariant} />;
  }
  ```

  This also introduces a small breaking change to the `VariantSelector` component, which now immediately updates which variant is active. If you'd like to retain the current functionality, and have the `VariantSelector` wait for the page navigation to complete before updating, use the `waitForNavigation` prop:

  ```tsx
  <VariantSelector
    handle={product.handle}
    options={product.options}
    waitForNavigation
  >
    ...
  </VariantSelector>
  ```

- Return `null` instead of empty object from `cart.get()` when the cart id is invalid. ([#2258](https://github.com/Shopify/hydrogen/pull/2258)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`54c2f7ad`](https://github.com/Shopify/hydrogen/commit/54c2f7ad3d0d52e6be10b2a54a1a4fd0cc107a35)]:
  - @shopify/hydrogen-react@2024.7.1

## 2024.4.3

### Patch Changes

- Add the `useOptimisticCart()` hook. This hook takes the cart object as a parameter, and processes all pending cart actions, locally mutating the cart with optimistic state. An optimistic cart makes cart actions immediately render in the browser while the action syncs to the server. This increases the perceived performance of the application. ([#2069](https://github.com/Shopify/hydrogen/pull/2069)) by [@blittle](https://github.com/blittle)

  Example usage:

  ```tsx
  // Root loader returns the cart data
  export async function loader({context}: LoaderFunctionArgs) {
    return defer({
      cart: context.cart.get(),
    });
  }

  // The cart component renders each line item in the cart.
  export function Cart({cart}) {
    if (!cart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

    return cart.lines.nodes.map((line) => (
      <div key={line.id}>
        <Link to={`/products${line.merchandise.product.handle}`}>
          {line.merchandise.product.title}
        </Link>
      </div>
    ));
  }
  ```

  The problem with this code is that it can feel slow. If a new item is added to the cart, it won't render until the server action completes and the client revalidates the root loader with the new cart data.

  If we update the cart implementation with a new `useOptimisticCart()` hook, Hydrogen can take the pending add to cart action, and apply it locally with the existing cart data:

  ```tsx
  export function Cart({cart}) {
    const optimisticCart = useOptimisticCart(cart);

    if (!optimisticCart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

    return optimisticCart.lines.nodes.map((line) => (
      <div key={line.id}>
        <Link to={`/products${line.merchandise.product.handle}`}>
          {line.merchandise.product.title}
        </Link>
      </div>
    ));
  }
  ```

  This works automatically with the `CartForm.ACTIONS.LinesUpdate` and `CartForm.ACTIONS.LinesRemove`. To make it work with `CartForm.Actions.LinesAdd`, update the `CartForm` to include the `selectedVariant`:

  ```tsx
  export function ProductCard({product}) {
    return (
      <div>
        <h2>{product.title}</h2>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.LinesAdd}
          inputs={{
            lines: [
              {
                merchandiseId: product.selectedVariant.id,
                quantity: 1,
                // The whole selected variant is not needed on the server, used in
                // the client to render the product until the server action resolves
                selectedVariant: product.selectedVariant,
              },
            ],
          }}
        >
          <button type="submit">Add to cart</button>
        </CartForm>
      </div>
    );
  }
  ```

  Sometimes line items need to render differently when they have yet to process on the server. A new isOptimistic flag is added to each line item:

  ```tsx
  export function Cart({cart}) {
    const optimisticCart = useOptimisticCart(cart);

    if (!cart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

    return optimisticCart.lines.nodes.map((line) => (
      <div key={line.id} style={{opacity: line.isOptimistic ? 0.8 : 1}}>
        <Link to={`/products${line.merchandise.product.handle}`}>
          {line.merchandise.product.title}
        </Link>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.LinesRemove}
          inputs={{lineIds}}
          disabled={line.isOptimistic}
        >
          <button type="submit">Remove</button>
        </CartForm>
      </div>
    ));
  }
  ```

- Adds type support for the script-src-elem directive for CSPs ([#2105](https://github.com/Shopify/hydrogen/pull/2105)) by [@altonchaney](https://github.com/altonchaney)

- Fix `storefrontRedirect` to strip trailing slashes when querying for redirects. Resolves [#2090](https://github.com/Shopify/hydrogen/issues/2090) ([#2110](https://github.com/Shopify/hydrogen/pull/2110)) by [@blittle](https://github.com/blittle)

- Ignore `/favicon.ico` route in Subrequest Profiler. ([#2180](https://github.com/Shopify/hydrogen/pull/2180)) by [@frandiox](https://github.com/frandiox)

- Improve errors when a CJS dependency needs to be added to Vite's ssr.optimizeDeps.include. ([#2106](https://github.com/Shopify/hydrogen/pull/2106)) by [@frandiox](https://github.com/frandiox)

- `<Analytics>` and `useAnalytics` are now stable. ([#2141](https://github.com/Shopify/hydrogen/pull/2141)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Improve VariantSelector to return variant object in option values. Thank you @NabeelAhmed1721 by [@blittle](https://github.com/blittle)

- Fix: Use exiting `id_token` during Customer Account API token refresh because it does not get return in the API. ([#2103](https://github.com/Shopify/hydrogen/pull/2103)) by [@juanpprieto](https://github.com/juanpprieto)

- Fix optimizing deps when using PNPM. ([#2172](https://github.com/Shopify/hydrogen/pull/2172)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`73716c88`](https://github.com/Shopify/hydrogen/commit/73716c885c75b394265b50318baefaee8518c22f), [`30d18bdb`](https://github.com/Shopify/hydrogen/commit/30d18bdb2d48020a0fb416d4661fa6794600f2ba)]:
  - @shopify/hydrogen-react@2024.4.3

## 2024.4.2

### Patch Changes

- Add JSdoc to `getSelectedProductOptions` utility and cleanup the skeleton implementation ([#2089](https://github.com/Shopify/hydrogen/pull/2089)) by [@juanpprieto](https://github.com/juanpprieto)

- Adding support for B2B to the customer account client and cart handler to store and manage [buyer context](https://shopify.dev/docs/api/storefront/2024-07/input-objects/BuyerInput). Currently Unstable. ([#1886](https://github.com/Shopify/hydrogen/pull/1886)) by [@dustinfirman](https://github.com/dustinfirman)

- When extending the content security policy, if the default directive is 'none' then the default won't be merged into the final directive. ([#2076](https://github.com/Shopify/hydrogen/pull/2076)) by [@nkgentile](https://github.com/nkgentile)

- Update `content-security-policy-builder` subdependency to ESM version to avoid preprocessing in Vite. ([#2057](https://github.com/Shopify/hydrogen/pull/2057)) by [@frandiox](https://github.com/frandiox)

- Fix Analytics. Provider for error checking and working without privacy banner. ([#2025](https://github.com/Shopify/hydrogen/pull/2025)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`081e1498`](https://github.com/Shopify/hydrogen/commit/081e1498bba752e1bd4642b140104e46ce689a67)]:
  - @shopify/hydrogen-react@2024.4.2

## 2024.4.1

### Patch Changes

- Warn when using the deprecated Seo component ([#1983](https://github.com/Shopify/hydrogen/pull/1983)) by [@blittle](https://github.com/blittle)

- Fix names and URLs shown for HIT/STALE items in the Subrequest Profiler. ([#2021](https://github.com/Shopify/hydrogen/pull/2021)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`0f5cab00`](https://github.com/Shopify/hydrogen/commit/0f5cab00d7fbac313c0f3e9affb915638db8d5d9)]:
  - @shopify/hydrogen-react@2024.4.1

## 2024.4.0

### Minor Changes

- Change `storefrontRedirect` to ignore query parameters when matching redirects. For example, a redirect in the admin from `/snowboards` to `/collections/snowboards` will now match on the URL `/snowboards?utm_campaign=buffer` and redirect the user to `/collections/snowboards?utm_campaign=buffer`. ([#1900](https://github.com/Shopify/hydrogen/pull/1900)) by [@blittle](https://github.com/blittle)

  This is a breaking change. If you want to retain the legacy functionality that is query parameter sensitive, pass `matchQueryParams` to `storefrontRedirect()`:

  ```ts
  storefrontRedirect({
    request,
    response,
    storefront,
    matchQueryParams: true,
  });
  ```

### Patch Changes

- Make `StorefrontRedirect` case insensitive when querying redirect URLs from the Storefront API. ([#1941](https://github.com/Shopify/hydrogen/pull/1941)) by [@blittle](https://github.com/blittle)

- Fix bug where `storefrontRedirect` would return an error on soft page navigations. ([#1880](https://github.com/Shopify/hydrogen/pull/1880)) by [@blittle](https://github.com/blittle)

- Fix a bug where `cart` could be null, even though a new cart was created by adding a line item. ([#1865](https://github.com/Shopify/hydrogen/pull/1865)) by [@blittle](https://github.com/blittle)

  This allows calling the cart `.get()` method right after creating a new cart with
  one of the mutation methods: `create()`, `addLines()`, `updateDiscountCodes()`, `updateBuyerIdentity()`, `updateNote()`, `updateAttributes()`, `setMetafields()`.

  ```ts
  import {
    createCartHandler,
    cartGetIdDefault,
    cartSetIdDefault,
  } from '@shopify/hydrogen';

  const cartHandler = createCartHandler({
    storefront,
    getCartId: cartGetIdDefault(request.headers),
    setCartId: cartSetIdDefault(),
    cartQueryFragment: CART_QUERY_FRAGMENT,
    cartMutateFragment: CART_MUTATE_FRAGMENT,
  });

  await cartHandler.addLines([{merchandiseId: '...'}]);
  // .get() now returns the cart as expected
  const cart = await cartHandler.get();
  ```

- Add `postLogoutRedirectUri` option to the Customer Account API client's logout method. ([#1871](https://github.com/Shopify/hydrogen/pull/1871)) by [@michenly](https://github.com/michenly)

- Introducing `<UNSTABLE_Analytics.Provider>` that also includes Shopify analytics, Customer Privacy API and Privacy banner ([#1789](https://github.com/Shopify/hydrogen/pull/1789)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Export new Hydrogen Vite plugin from `@shopify/hydrogen/vite`. ([#1935](https://github.com/Shopify/hydrogen/pull/1935)) by [@frandiox](https://github.com/frandiox)

- Add the `customer-account push` command to the Hydrogen CLI. This allows you to push the current `--dev-origin` URL to the Shopify admin to enable secure connection to the Customer Account API for local development. ([#1804](https://github.com/Shopify/hydrogen/pull/1804)) by [@michenly](https://github.com/michenly)

- Fix default content security policy directive for `frameAncestors`. ([#1883](https://github.com/Shopify/hydrogen/pull/1883)) by [@blittle](https://github.com/blittle)

- Fall back to "mock.shop" when no value is passed in `storeDomain` to `createStorefrontClient` in development. ([#1971](https://github.com/Shopify/hydrogen/pull/1971)) by [@frandiox](https://github.com/frandiox)

- Allow `ui_locale` to be passed to the customer account login page. ([#1842](https://github.com/Shopify/hydrogen/pull/1842)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Deprecate the `<Seo />` component in favor of directly using Remix [meta route exports](https://remix.run/docs/en/main/route/meta). Add the `getSeoMeta` to make migration easier. ([#1875](https://github.com/Shopify/hydrogen/pull/1875)) by [@blittle](https://github.com/blittle)

  ### Migration steps:

  **1. Remove the `<Seo />` component from `root.jsx`:**

  ```diff
   export default function App() {
     const nonce = useNonce();
     const data = useLoaderData<typeof loader>();

     return (
       <html lang="en">
         <head>
           <meta charSet="utf-8" />
           <meta name="viewport" content="width=device-width,initial-scale=1" />
  -        <Seo />
           <Meta />
           <Links />
         </head>
         <body>
           <Layout {...data}>
             <Outlet />
           </Layout>
           <ScrollRestoration nonce={nonce} />
           <Scripts nonce={nonce} />
           <LiveReload nonce={nonce} />
         </body>
       </html>
     );
   }

  ```

  **2. Add a Remix meta export to each route that returns an `seo` property from a `loader` or `handle`:**

  ```diff
  +import {getSeoMeta} from '@shopify/hydrogen';

   export async function loader({context}) {
     const {shop} = await context.storefront.query(`
       query layout {
         shop {
           name
           description
         }
       }
     `);

     return {
       seo: {
         title: shop.title,
         description: shop.description,
       },
     };
   }

  +export const meta = ({data}) => {
  +   return getSeoMeta(data.seo);
  +};
  ```

  **3. Merge root route meta data**

  If your root route loader also returns an `seo` property, make sure to merge that data:

  ```ts
  export const meta = ({data, matches}) => {
    return getSeoMeta(
      matches[0].data.seo,
      // the current route seo data overrides the root route data
      data.seo,
    );
  };
  ```

  Or more simply:

  ```ts
  export const meta = ({data, matches}) => {
    return getSeoMeta(...matches.map((match) => match.data.seo));
  };
  ```

  **4. Override meta**

  Sometimes `getSeoMeta` might produce a property in a way you'd like to change. Map over the resulting array to change it. For example, Hydrogen removes query parameters from canonical URLs, add them back:

  ```ts
  export const meta = ({data, location}) => {
    return getSeoMeta(data.seo).map((meta) => {
      if (meta.rel === 'canonical') {
        return {
          ...meta,
          href: meta.href + location.search,
        };
      }

      return meta;
    });
  };
  ```

- Updated dependencies [[`f4d6e5b0`](https://github.com/Shopify/hydrogen/commit/f4d6e5b0244392a7c13b9fa51c5046fd103c3e4f), [`a209019f`](https://github.com/Shopify/hydrogen/commit/a209019f722ece4b65f8d5f37c8018c949956b1e), [`e50f4349`](https://github.com/Shopify/hydrogen/commit/e50f4349b665a1ff547a8d6229a6269157d867bd)]:
  - @shopify/hydrogen-react@2024.4.0

## 2024.1.4

### Patch Changes

- add optional fetcher key to CartForm ([#1792](https://github.com/Shopify/hydrogen/pull/1792)) by [@rmiller61](https://github.com/rmiller61)

- Fix XSS vulnerability in the SEO component ([#1839](https://github.com/Shopify/hydrogen/pull/1839)) by [@blittle](https://github.com/blittle)

## 2024.1.3

### Patch Changes

- Fix `PreviousLink` and `NextLink` types in the Pagination component. ([#1774](https://github.com/Shopify/hydrogen/pull/1774)) by [@lorenzo-del-rosario](https://github.com/lorenzo-del-rosario)

## 2024.1.2

### Patch Changes

- 🐛 Fix issue where customer login does not persist to checkout ([#1719](https://github.com/Shopify/hydrogen/pull/1719)) by [@michenly](https://github.com/michenly)

  ✨ Add `customerAccount` option to `createCartHandler`. Where a `?logged_in=true` will be added to the checkoutUrl for cart query if a customer is logged in.

- Customer Account API client's `query` & `mutate` method now returns `errors` as an array of GraphQLError(s) that is better formatted. ([#1765](https://github.com/Shopify/hydrogen/pull/1765)) by [@michenly](https://github.com/michenly)

  Log GraphQL errors automatically in Customer Account API client, with a new `logErrors: boolean` option to disable it.

- Updated dependencies [[`409e1bca`](https://github.com/Shopify/hydrogen/commit/409e1bcab3b2bd291179013350df13315f045479)]:
  - @shopify/hydrogen-react@2024.1.1

## 2024.1.1

### Patch Changes

- Add support for multiple schemas in GraphiQL. Fix links in Subrequest Profiler. ([#1693](https://github.com/Shopify/hydrogen/pull/1693)) by [@frandiox](https://github.com/frandiox)

- ♻️ `CustomerClient` type is deprecated and replaced by `CustomerAccount` ([#1692](https://github.com/Shopify/hydrogen/pull/1692)) by [@michenly](https://github.com/michenly)

- Log GraphQL errors automatically in Storefront client, with a new `logErrors: boolean` option to disable it. Add back a link to GraphiQL in the error message. ([#1690](https://github.com/Shopify/hydrogen/pull/1690)) by [@frandiox](https://github.com/frandiox)

## 2024.1.0

### Major Changes

- Better Hydrogen error handling ([#1645](https://github.com/Shopify/hydrogen/pull/1645)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - Fix storefront client throwing on partial successful errors
  - Fix subrequest profiler to better display network errors with URL information for Storefront API requests

  ### Breaking change

  This update changes the shape of the error objects returned by the `createCartHandler` method.

  Previously, mutations could return an `errors` array that contained a `userErrors` array.

  With this change, these arrays are no longer nested. The response can contain both an `errors` array and a `userErrors` array. `errors` contains GraphQL execution errors. `userErrors` contains errors caused by the cart mutation itself (such as adding a product that has zero inventory).

  `storefront.isApiError` is deprecated.

  ### Updated return types for `createCartHandler` methods

  - `cart.get()` used to return a `Cart` type. Now it returns `CartReturn` type to accommodate the `errors` object.
  - All other `cart` methods (ie. `cart.addLines`) used to return a `CartQueryData` type. Now it returns `CartQueryDataReturn` type to accommodate the `errors` object.

- Custom rules passed to `createContentSecurityPolicy` now extend the default Shopify and development domains, instead of overriding them ([#1593](https://github.com/Shopify/hydrogen/pull/1593)) by [@michenly](https://github.com/michenly)

- Upgrade to [Storefront API v2024-01](https://shopify.dev/docs/api/release-notes/2024-01#storefront-api-changes) ([#1642](https://github.com/Shopify/hydrogen/pull/1642)) by [@wizardlyhel](https://github.com/wizardlyhel)

### Minor Changes

- Add [Subrequest Profiler](https://shopify.dev/docs/custom-storefronts/hydrogen/debugging/subrequest-profiler) developer tool to enable better observability of server-side network requests and caching behaviors ([#1511](https://github.com/Shopify/hydrogen/pull/1511)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Introduce the new [`createCustomerAccountClient`](https://shopify.dev/docs/api/hydrogen/2024-01/utilities/createcustomeraccountclient) for interacting with the Customer Account API ([#1606](https://github.com/Shopify/hydrogen/pull/1606)) by [@michenly](https://github.com/michenly)

### Patch Changes

- Fix a bug that allowed undesired redirect to external domains ([#1629](https://github.com/Shopify/hydrogen/pull/1629)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix content security policy to recognize `localhost` asset server as a valid source when running the `dev` command ([#1591](https://github.com/Shopify/hydrogen/pull/1591)) by [@michenly](https://github.com/michenly)

- Fix the `<Seo />` component to render canonical URLs without trailing slashes. Thanks to @joshuafredrickson for reporting ([#1622](https://github.com/Shopify/hydrogen/pull/1622)) by [@blittle](https://github.com/blittle)

- Make default `HydrogenSession` type extensible. ([#1590](https://github.com/Shopify/hydrogen/pull/1590)) by [@michenly](https://github.com/michenly)

  Update implementation of HydrogenSession using type:

  ```diff
  import {
  + type HydrogenSession,
  } from '@shopify/hydrogen';
  - class HydrogenSession {
  + class AppSession implements HydrogenSession {
      ...
  }
  ```

- Fix error stack traces thrown by API clients if promises are not awaited ([#1656](https://github.com/Shopify/hydrogen/pull/1656)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`0629bc77`](https://github.com/Shopify/hydrogen/commit/0629bc779b4dab3482b502cde0cc67d32f41f2f2), [`dc8f90de`](https://github.com/Shopify/hydrogen/commit/dc8f90de38d1bf7166bbf2e219f6d9e6f55250c6), [`ca1161b2`](https://github.com/Shopify/hydrogen/commit/ca1161b29ad7b4d0838953782fb114d5fe82193a)]:
  - @shopify/hydrogen-react@2024.1.0

## 2023.10.3

### Patch Changes

- Fix the Pagination component to always restore scroll correctly on back/forth navigation. ([#1508](https://github.com/Shopify/hydrogen/pull/1508)) by [@blittle](https://github.com/blittle)

- Serve assets from a separate domain when running the dev server, to better simulate cross-domain behaviors. This makes it more realistic to work with CORS requests, content security policies, and CDN paths in development. ([#1503](https://github.com/Shopify/hydrogen/pull/1503)) by [@frandiox](https://github.com/frandiox)

- Export caching types to make creating custom clients easier in TypeScript. ([#1507](https://github.com/Shopify/hydrogen/pull/1507)) by [@juanpprieto](https://github.com/juanpprieto)

- Update the return types of the Customer Account API query and mutation methods. Also update Customer Account API default version to 2024-01. ([#1537](https://github.com/Shopify/hydrogen/pull/1537)) by [@blittle](https://github.com/blittle)

- Fix how peer dependencies are resolved. ([#1489](https://github.com/Shopify/hydrogen/pull/1489)) by [@frandiox](https://github.com/frandiox)

- Add default `channel` value of `hydrogen` to Hydrogen’s `ShopPayButton` component. ([#1447](https://github.com/Shopify/hydrogen/pull/1447)) by [@QuintonC](https://github.com/QuintonC)

- Updated dependencies [[`848c6260`](https://github.com/Shopify/hydrogen/commit/848c6260a2db3a9cb0c86351f0f7128f61e028f0), [`62f67873`](https://github.com/Shopify/hydrogen/commit/62f67873359982ffa08f617085787a1fc174c3fa), [`e8cc49fe`](https://github.com/Shopify/hydrogen/commit/e8cc49feff18f5ee72d5f6965ff2094addc23466)]:
  - @shopify/hydrogen-react@2023.10.1

## 2023.10.2

### Patch Changes

- Change @remix-run/server-runtime to properly be a peer dependency by [@blittle](https://github.com/blittle)

## 2023.10.1

### Patch Changes

- SEO component: remove URL params from canonical tags ([#1478](https://github.com/Shopify/hydrogen/pull/1478)) by [@scottdixon](https://github.com/scottdixon)

## 2023.10.0

### Major and Breaking Changes

#### Remix v2 ([#1289](https://github.com/Shopify/hydrogen/pull/1289)) by [@frandiox](https://github.com/frandiox)

Hydrogen 2023-10 has upgraded to Remix v2 and is now a peer dependency.

- Please check the [Remix v2 release notes](https://github.com/remix-run/remix/releases/tag/remix%402.0.0) to see what needs to be changed in your app code. Common changes include:

  - Renaming types prefixed with `V2_`. For example, `V2_MetaFunction` is now `MetaFunction`.
  - Renaming other types like `LoaderArgs` and `ActionArgs`, which are now `LoaderFunctionArgs` and `ActionFunctionArgs` respectively.

  If you were not already using v2 flags, follow the official [Remix migration guide](https://remix.run/docs/en/main/start/v2) before upgrading to v2.

- Update to Remix v2. Remix is now a peer dependency and its version is no longer pinned. This means that you can upgrade to newer Remix 2.x versions without upgrading Hydrogen. ([#1289](https://github.com/Shopify/hydrogen/pull/1289)) by [@frandiox](https://github.com/frandiox)

#### Other breaking changes

- The default [caching strategy](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies) has been updated. The new default caching strategy provides a `max-age` value of 1 second, and a `stale-while-revalidate` value of 1 day. If you would keep the old caching values, update your queries to use `CacheShort`: ([#1336](https://github.com/Shopify/hydrogen/pull/1336)) by [@benjaminsehl](https://github.com/benjaminsehl)

  ```diff
   const {product} = await storefront.query(
     `#graphql
       query Product($handle: String!) {
         product(handle: $handle) { id title }
       }
     `,
     {
       variables: {handle: params.productHandle},
  +    /**
  +     * Override the default caching strategy with the old caching values
  +     */
  +    cache: storefront.CacheShort(),
     },
   );
  ```

- The Storefront API types included are now generated using `@graphql-codegen/typescript@4` ([changelog](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/typescript/typescript/CHANGELOG.md#400)). This results in a breaking change if you were importing `Scalars` directly from `@shopify/hydrogen-react` or `@shopify/hydrogen`: ([#1108](https://github.com/Shopify/hydrogen/pull/1108)) by [@frandiox](https://github.com/frandiox)

  ```diff
   import type {Scalars} from '@shopify/hydrogen/storefront-api-types';

   type Props = {
  -  id: Scalars['ID']; // This was a string
  +  id: Scalars['ID']['input']; // Need to access 'input' or 'output' to get the string
   };
  ```

### Patch Changes

- Add a client to query the [Customer Account API](https://shopify.dev/docs/api/customer) ([#1430](https://github.com/Shopify/hydrogen/pull/1430)) by [@blittle](https://github.com/blittle)

- Update Storefront API version to 2023-10 ([#1431](https://github.com/Shopify/hydrogen/pull/1431)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Custom cart methods are now stable: ([#1440](https://github.com/Shopify/hydrogen/pull/1440)) by [@wizardlyhel](https://github.com/wizardlyhel)

  ```diff
   const cart = createCartHandler({
     storefront,
     getCartId,
     setCartId: cartSetIdDefault(),
  -  customMethods__unstable: {
  +  customMethods: {
       addLines: async (lines, optionalParams) => {
        // ...
       },
     },
   });
  ```

- Remove deprecated parameters and props (#1455 and #1435): ([#1435](https://github.com/Shopify/hydrogen/pull/1435)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - `createStorefrontClient` parameters `buyerIp` and `requestGroupId`
  - `<Image>` props `loaderOptions` and `widths`

- Add query explorer plugin to GraphiQL. Start your dev server and load `http://localhost:3000/graphiql` to use GraphiQL. ([#1470](https://github.com/Shopify/hydrogen/pull/1470)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`0ae7cbe2`](https://github.com/Shopify/hydrogen/commit/0ae7cbe280d8351126e11dc13f35d7277d9b2d86), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3)]:
  - @shopify/hydrogen-react@2023.10.0

## 2023.7.13

### Patch Changes

- Fix template dist package due to CI error ([#1451](https://github.com/Shopify/hydrogen/pull/1451)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`3eb376fe`](https://github.com/Shopify/hydrogen/commit/3eb376fe8796b50131dc43845772ae555e07a1a6)]:
  - @shopify/hydrogen-react@2023.7.6

## 2023.7.12

### Patch Changes

- Move `react` to peer dependencies. It had been added as a direct dependency by mistake in a previous version. ([#1439](https://github.com/Shopify/hydrogen/pull/1439)) by [@frandiox](https://github.com/frandiox)

- Integrate the debug-network tooling with the new `--worker-unstable` runtime CLI flag. ([#1387](https://github.com/Shopify/hydrogen/pull/1387)) by [@frandiox](https://github.com/frandiox)

- Calls to `withCache` can now be shown in the `/debug-network` tool when using the Worker runtime. For this to work, use the new `request` parameter in `createWithCache`: ([#1438](https://github.com/Shopify/hydrogen/pull/1438)) by [@frandiox](https://github.com/frandiox)

  ```diff
  export default {
    fetch(request, env, executionContext) {
      // ...
      const withCache = createWithCache({
        cache,
        waitUntil,
  +     request,
      });
      // ...
    },
  }
  ```

- Updated dependencies [[`d30e2651`](https://github.com/Shopify/hydrogen/commit/d30e265180e7856d2257d8cad0bd067c8a91e9cc), [`1b45311d`](https://github.com/Shopify/hydrogen/commit/1b45311d28b2ca941c479a1896efa89a9b71bec1), [`2627faa7`](https://github.com/Shopify/hydrogen/commit/2627faa7f09ba306506bb206d4d6624de5691961)]:
  - @shopify/hydrogen-react@2023.7.5

## 2023.7.11

### Patch Changes

- Fix subrequest performance in development. ([#1411](https://github.com/Shopify/hydrogen/pull/1411)) by [@frandiox](https://github.com/frandiox)

## 2023.7.10

### Patch Changes

- Ensure `storefrontRedirect` fallback only redirects to relative URLs. ([#1399](https://github.com/Shopify/hydrogen/pull/1399)) by [@frandiox](https://github.com/frandiox)

## 2023.7.9

### Patch Changes

- Allow generic inference in standalone usage of WithCache type - Contributed by @chinanderm ([#1363](https://github.com/Shopify/hydrogen/pull/1363)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Cart Optimistic UI helpers ([#1366](https://github.com/Shopify/hydrogen/pull/1366)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix storefront sub request cache key ([#1375](https://github.com/Shopify/hydrogen/pull/1375)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Fix the Pagination component to use forwardRefs for the NextLink and PreviousLink render props ([#1362](https://github.com/Shopify/hydrogen/pull/1362)) by [@blittle](https://github.com/blittle)

## 2023.7.8

### Patch Changes

- The `error.cause` property throw from the Storefront client is now stringified. ([#1184](https://github.com/Shopify/hydrogen/pull/1184)) by [@frandiox](https://github.com/frandiox)

- Fix Hydrogen's Storefront API client to not throw unhandled promise exceptions. This is because Remix is guaranteed to handle exceptions from the loader and fixing it prevents Hydrogen from crashing when deployed to some runtimes on unhandled promise exceptions. ([#1318](https://github.com/Shopify/hydrogen/pull/1318)) by [@blittle](https://github.com/blittle)

- Relax prop validation on the `getSelectedProductOptions` and `getSelectedProductOptions` utilities to look for member props instead of checking with `instanceof`. ([#1327](https://github.com/Shopify/hydrogen/pull/1327)) by [@blittle](https://github.com/blittle)

## 2023.7.7

### Patch Changes

- Supress the hydration warning in the new `<Script>` component when `nonce` values differ between the server and client, which is expected. ([#1312](https://github.com/Shopify/hydrogen/pull/1312)) by [@frandiox](https://github.com/frandiox)

- (Unstable) server-side network request debug virtual route ([#1284](https://github.com/Shopify/hydrogen/pull/1284)) by [@wizardlyhel](https://github.com/wizardlyhel)

  1. Update your `server.ts` so that it also passes in the `waitUntil` and `env`.

     ```diff
       const handleRequest = createRequestHandler({
         build: remixBuild,
         mode: process.env.NODE_ENV,
     +    getLoadContext: () => ({session, storefront, env, waitUntil}),
       });
     ```

     If you are using typescript, make sure to update `remix.env.d.ts`

     ```diff
       declare module '@shopify/remix-oxygen' {
         export interface AppLoadContext {
     +     env: Env;
           cart: HydrogenCart;
           storefront: Storefront;
           session: HydrogenSession;
     +      waitUntil: ExecutionContext['waitUntil'];
         }
       }
     ```

  2. Run `npm run dev` and you should see terminal log information about a new virtual route that you can view server-side network requests at http://localhost:3000/debug-network

  3. Open http://localhost:3000/debug-network in a tab and your app another tab. When you navigate around your app, you should see server network requests being logged in the debug-network tab

## 2023.7.6

### Patch Changes

- Updated dependencies [[`345f06a2`](https://github.com/Shopify/hydrogen/commit/345f06a27886eceaf1ea6b75971c1130b059e2db)]:
  - @shopify/hydrogen-react@2023.7.4

## 2023.7.5

### Patch Changes

- Fix the Pagination component to reset internal state when the URL changes (not including Pagination params). ([#1291](https://github.com/Shopify/hydrogen/pull/1291)) by [@blittle](https://github.com/blittle)

  We also now validate the connection prop to include a `pageInfo` object with the following properties:

  1. `hasNextPage`
  1. `hasPreviousPage`
  1. `endCursor`
  1. `startCursor`

  Previously our templates had a bug where `startCursor` was not included. Upgrading means the app will error
  until you update your query to include it:

  ```diff
   query CollectionDetails {
     collection(handle: $handle) {
       ...
       pageInfo {
         hasPreviousPage
         hasNextPage
         hasNextPage
         endCursor
  +      startCursor
       }
     }
   }

  ```

## 2023.7.4

### Patch Changes

- Fix hydration errors and stale data within the Pagination component ([#1283](https://github.com/Shopify/hydrogen/pull/1283)) by [@blittle](https://github.com/blittle)

- Add custom product paths to the `VariantSelector` component: ([#1271](https://github.com/Shopify/hydrogen/pull/1271)) by [@blittle](https://github.com/blittle)

  ```tsx
  <VariantSelector handle="snowboard" productPath="shop" options={options}>
    {/* ... */}
  </VariantSelector>
  ```

- Add functionality for creating a Content Security Policy. See the [guide on Content Security Policies](https://shopify.dev/docs/custom-storefronts/hydrogen/content-security-policy) for more details. ([#1235](https://github.com/Shopify/hydrogen/pull/1235)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`06516ee9`](https://github.com/Shopify/hydrogen/commit/06516ee91f20153902c2b8ef79c0f6690ba385bb), [`423acee2`](https://github.com/Shopify/hydrogen/commit/423acee243c62e49a865ff2cd82735991aca1d8f)]:
  - @shopify/hydrogen-react@2023.7.3

## 2023.7.3

### Patch Changes

- Exported the type `CookieOptions` from `cartSetIdDefault` ([#1153](https://github.com/Shopify/hydrogen/pull/1153)) by [@remcolakens](https://github.com/remcolakens)

- Updated dependencies [[`e9e1736a`](https://github.com/Shopify/hydrogen/commit/e9e1736ace6bd981e8109e38402eb405f7c865c1), [`1a0e858d`](https://github.com/Shopify/hydrogen/commit/1a0e858d94ea7d14f3f37ca32d288b33436038b0)]:
  - @shopify/hydrogen-react@2023.7.2

## 2023.7.2

### Patch Changes

- Surface storefront api response errors ([#1205](https://github.com/Shopify/hydrogen/pull/1205)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`d80c4ada`](https://github.com/Shopify/hydrogen/commit/d80c4ada051dd5530c12720cb7d8e8c6dda19c98)]:
  - @shopify/hydrogen-react@2023.7.1

## 2023.7.1

### Patch Changes

- Update to Remix v1.19.1. ([#1172](https://github.com/Shopify/hydrogen/pull/1172)) by [@frandiox](https://github.com/frandiox)

  See changes for [1.18](https://github.com/remix-run/remix/releases/tag/remix%401.18.0) and [1.19](https://github.com/remix-run/remix/releases/tag/remix%401.19.0).

## 2023.7.0

## What’s new

⭐️ Check out our [blog post](https://hydrogen.shopify.dev/updates) with all the latest updates on Hydrogen, and what’s coming on the roadmap.

The latest version of Hydrogen comes with new and updated components and utilities that can help you speed up your build:

- An updated server-side [Cart component](https://shopify.dev/docs/custom-storefronts/hydrogen/cart) with built-in abstractions to handle most common cart operations, including adding, updating, or deleting line items, applying discounts, and more.
- A drop-in [`<Pagination/>` component](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination) to make it easier to handle large product collections.
- A new [`<VariantSelector/>` component](https://shopify.dev/docs/custom-storefronts/hydrogen/cart/variant-selector) that makes it faster to build progressively enhanced product forms.
- Improved support for predictive search and local pickup options through Storefront API version [2023-07](https://shopify.dev/docs/api/release-notes/2023-07#graphql-storefront-api-changes).

### Breaking Changes

- `createWithCache` is now stable. All imports need to be updated: ([#1151](https://github.com/Shopify/hydrogen/pull/1151)) by [@blittle](https://github.com/blittle)

  ```diff
  - import {createWithCache_unstable} from '@shopify/hydrogen';
  + import {createWithCache} from '@shopify/hydrogen';
  ```

- `Pagination` and `getPaginationVariables` are now stable. ([#1129](https://github.com/Shopify/hydrogen/pull/1129)) by [@blittle](https://github.com/blittle)

  All imports to each should be updated:

  ```diff
  - import {Pagiatinon__unstable, getPaginationVariables__unstable} from '@shopify/hydrogen';
  + import {Pagiatinon, getPaginationVariables} from '@shopify/hydrogen';
  ```

### Patch Changes

- Function and component for cart management: ([#786](https://github.com/Shopify/hydrogen/pull/786)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - `createCartHandler` - Creates an object instance that simplifies cart operations such as add/update/remove from cart.
  - `CartForm` - A form component that helps you sets up form inputs for cart handler.

  **Documentation:**

  - Updated [how-to guides](https://shopify.dev/docs/custom-storefronts/hydrogen/cart)
  - [`createCartHandler`](https://shopify.dev/docs/api/hydrogen/2023-04/utilities/createcarthandler)
  - [`CartForm`](https://shopify.dev/docs/api/hydrogen/2023-04/components/cartform)

- Export useLoadScript ([#1080](https://github.com/Shopify/hydrogen/pull/1080)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Throw error when `storeDomain` is not passed to `createStorefrontClient`. ([#1128](https://github.com/Shopify/hydrogen/pull/1128)) by [@frandiox](https://github.com/frandiox)

- Improve warning and error format for known Hydrogen messages in development. ([#1093](https://github.com/Shopify/hydrogen/pull/1093)) by [@frandiox](https://github.com/frandiox)

- Add an example using the new [Customer Account API](https://shopify.dev/docs/api/customer) ([#1126](https://github.com/Shopify/hydrogen/pull/1126)) by [@blittle](https://github.com/blittle)

- Corrected the `$attributes` type in `CART_ATTRIBUTES_UPDATE_MUTATION` to match the expected one ([#1117](https://github.com/Shopify/hydrogen/pull/1117)) by [@remcolakens](https://github.com/remcolakens)

- Fix cache key by url encode the sub request keys ([#1105](https://github.com/Shopify/hydrogen/pull/1105)) by [@wizardlyhel](https://github.com/wizardlyhel)

Add a `<VariantSelector>` component to make building product forms easier. Also added the `getSelectedProductOptions` helper function. See the [guide on using the VariantSelector](https://shopify.dev/docs/custom-storefronts/hydrogen/cart/variant-selector). ([#1027](https://github.com/Shopify/hydrogen/pull/1027)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`c39411e0`](https://github.com/Shopify/hydrogen/commit/c39411e0454750697d580a1ef4858800c494980f), [`0d2e5ffb`](https://github.com/Shopify/hydrogen/commit/0d2e5ffb68096f1dc48ade8793e6ef53088af6da), [`4bee03df`](https://github.com/Shopify/hydrogen/commit/4bee03df3cc8203510f6b05522c1268aa5e5f2f4), [`11ab64a8`](https://github.com/Shopify/hydrogen/commit/11ab64a88966dd7b90522f15836abfff6f5d595f), [`7a7456a5`](https://github.com/Shopify/hydrogen/commit/7a7456a5ab073559aef37f043e8aa47570639b96)]:
  - @shopify/hydrogen-react@2023.4.6

## 2023.4.6

### Patch Changes

- Updated dependencies [[`b8f41ad7`](https://github.com/Shopify/hydrogen/commit/b8f41ad7174056f304301022a2aa77cecfdf0824)]:
  - @shopify/hydrogen-react@2023.4.5

## 2023.4.5

### Patch Changes

- Update Remix to the latest version (`1.17.1`). ([#852](https://github.com/Shopify/hydrogen/pull/852)) by [@frandiox](https://github.com/frandiox)

  When updating your app, remember to also update your Remix dependencies to `1.17.1` in your `package.json` file:

  ```diff
  -"@remix-run/react": "1.15.0",
  +"@remix-run/react": "1.17.1",

  -"@remix-run/dev": "1.15.0",
  -"@remix-run/eslint-config": "1.15.0",
  +"@remix-run/dev": "1.17.1",
  +"@remix-run/eslint-config": "1.17.1",
  ```

## 2023.4.4

### Patch Changes

- Fix redirects to respond with a 301 ([#946](https://github.com/Shopify/hydrogen/pull/946)) by [@blittle](https://github.com/blittle)

- A default `https://` protocol is now added automatically to `storeDomain` if missing. ([#985](https://github.com/Shopify/hydrogen/pull/985)) by [@frandiox](https://github.com/frandiox)

- Fix `flattenConnection()`'s TypeScript types when working with `edges.node` ([#945](https://github.com/Shopify/hydrogen/pull/945)) by [@frehner](https://github.com/frehner)

- Make `storefrontApiVersion` parameter optional. By default, it will use the current version of Hydrogen as the Storefront API version. ([#984](https://github.com/Shopify/hydrogen/pull/984)) by [@frandiox](https://github.com/frandiox)

- Skip reading and writing cache in sub-requests when the strategy is CacheNone. ([#964](https://github.com/Shopify/hydrogen/pull/964)) by [@frandiox](https://github.com/frandiox)

- Fix `<ModelViewer>` to properly set className ([#966](https://github.com/Shopify/hydrogen/pull/966)) by [@blittle](https://github.com/blittle)

- Add a `/admin` route that redirects to the Shopify admin. This redirect can be disabled by passing `noAdminRedirect: true` to `storefrontRedirect`: ([#989](https://github.com/Shopify/hydrogen/pull/989)) by [@blittle](https://github.com/blittle)

  ```ts
  storefrontRedirect({
    redirect,
    response,
    storefront,
    noAdminRedirect: true,
  });
  ```

- Updated dependencies [[`7b4afea2`](https://github.com/Shopify/hydrogen/commit/7b4afea29a050f9c77482540e321d9bc60351b2e), [`32515232`](https://github.com/Shopify/hydrogen/commit/32515232aa03077b542f5fcf95f38a715af09327), [`7d6a1a7c`](https://github.com/Shopify/hydrogen/commit/7d6a1a7cd3adb6ee0cf4cf242b72d5650509639b), [`442f602a`](https://github.com/Shopify/hydrogen/commit/442f602a45902beeb188575a85151f45b8be23ca), [`b9ab8eb7`](https://github.com/Shopify/hydrogen/commit/b9ab8eb70f1506ab7516804ea69ecb9a693c420a), [`93a7c3c6`](https://github.com/Shopify/hydrogen/commit/93a7c3c65fc10c8b1a16cee5fa57ad932d278dc8)]:
  - @shopify/hydrogen-react@2023.4.4

## 2023.4.3

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`7aaa4e86`](https://github.com/Shopify/hydrogen/commit/7aaa4e86739e22b2d9a517e2b2cfc20110c87acd)]:
  - @shopify/hydrogen-react@2023.4.3

## 2023.4.2

### Patch Changes

- Add support for generated types from the new unstable codegen feature in the CLI. ([#707](https://github.com/Shopify/hydrogen/pull/707)) by [@frandiox](https://github.com/frandiox)

- Add a `<Pagination__unstable>` component and `getPaginationVariables__unstable` helper to make rendering large lists from the Storefront API easy. This is an initial unstable release and we expect to finalize the API by the 2023-07 release. See the [`<Pagination>` component documentation](https://shopify.dev/docs/api/hydrogen/2023-04/components/pagination). ([#755](https://github.com/Shopify/hydrogen/pull/755)) by [@cartogram](https://github.com/cartogram)

- Updated dependencies [[`2e1e4590`](https://github.com/Shopify/hydrogen/commit/2e1e45905444ab04fe1fe308ecd2bd00a0e8fce1)]:
  - @shopify/hydrogen-react@2023.4.2

## 2023.4.1

### Patch Changes

- Adds `parseGid()` which is a helper function that takes in a [Shopify GID](https://shopify.dev/docs/api/usage/gids) and returns the `resource` and `id` from it. For example: ([#845](https://github.com/Shopify/hydrogen/pull/845)) by [@frehner](https://github.com/frehner)

  ```js
  import {parseGid} from '@shopify/hydrogen-react';

  const {id, resource} = parseGid('gid://shopify/Order/123');

  console.log(id); // 123
  console.log(resource); // Order
  ```

- Avoid warning about missing `buyerIp` when using private access tokens in development. ([#836](https://github.com/Shopify/hydrogen/pull/836)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`0a009a3b`](https://github.com/Shopify/hydrogen/commit/0a009a3ba06dadd8f9d799575d7f88590f82a966)]:
  - @shopify/hydrogen-react@2023.4.1

## 2023.4.0

### Major Changes

- Releases `2023-04` ([#754](https://github.com/Shopify/hydrogen/pull/754)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Updates Hydrogen to [Storefront 2023-04 API release](https://shopify.dev/docs/api/release-notes/2023-04).

- Updates types from `CartLineConnection` to `BaseCartLineConnection`.

- Deprecates `CartLinePrice` from `@shopify/hydrogen-react` use `Money` instead:

  ```diff
  - import {CartLinePrice} from '@shopify/hydrogen-react';
  + import {Money} from '@shopify/hydrogen-react';
  ```

  ```diff
  - <CartLinePrice line={line} />
  + <Money data={line.priceV2} />
  ```

  [Check the docs for using `Money` 💵.](https://shopify.dev/docs/api/hydrogen-react/2023-04/components/money)

- Adds a new `Image` component, replacing the existing one. While your existing implementation won't break, props `widths` and `loaderOptions` are now deprecated disregarded, with a new `aspectRatio` prop added. ([#787](https://github.com/Shopify/hydrogen/pull/787)) by [@benjaminsehl](https://github.com/benjaminsehl)

  ### Migrating to the new `Image`

  The new `Image` component is responsive by default, and requires less configuration to ensure the right image size is being rendered on all screen sizes.

  **Before**

  ```jsx
  <Image
    data={image}
    widths={[400, 800, 1200]}
    width="100px"
    sizes="90vw"
    loaderOptions={{
      scale: 2,
      crop: 'left',
    }}
  />
  ```

  **After**

  ```jsx
  <Image data={image} sizes="90vw" crop="left" aspectRatio="3/2" />
  ```

  Note that `widths` and `loaderOptions` have now been deprecated, declaring `width` is no longer necessary, and we’ve added an `aspectRatio` prop:

  - `widths` is now calculated automatically based on a new `srcSetOptions` prop (see below for details).
  - `loaderOptions` has been removed in favour of declaring `crop` and `src` as props. `width` and `height` should only be set as props if rendering a fixed image size, with `width` otherwise defaulting to `100%`, and the loader calculating each dynamically.
  - `aspectRatio` is calculated automatically using `data.width` and `data.height` (if available) — but if you want to present an image with an aspect ratio other than what was uploaded, you can set using the format `Int/Int` (e.g. `3/2`, [see MDN docs for more info](https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio), note that you must use the _fraction_ style of declaring aspect ratio, decimals are not supported); if you've set an `aspectRatio`, we will default the crop to be `crop: center` (in the example above we've specified this to use `left` instead).

  ### Examples

  <!-- Simplest possible usage -->

  #### Basic Usage

  ```jsx
  <Image data={data} />
  ```

  This would use all default props, which if exhaustively declared would be the same as typing:

  ```jsx
  <Image
    data={data}
    crop="center"
    decoding="async"
    loading="lazy"
    width="100%"
    sizes="100vw"
    srcSetOptions={{
      interval: 15,
      startingWidth: 200,
      incrementSize: 200,
      placeholderWidth: 100,
    }}
  />
  ```

  An alternative way to write this without using `data` would be to use the `src`, `alt`, and `aspectRatio` props. For example:

  ```jsx
  <Image
    src={data.url}
    alt={data.altText}
    aspectRatio={`${data.width}/${data.height}`}
  />
  ```

  Assuming `data` had the following shape:

  ```json
  {
    "url": "https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg",
    "altText": "alt text",
    "width": "4000",
    "height": "4000"
  }
  ```

  All three above examples would result in the following HTML:

  ```html
  <img
    srcset="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=300&height=300&crop=center 300w, … *13 additional sizes* … https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=3000&height=3000&crop=center 3000w"
    src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=100&height=100&crop=center"
    alt="alt text"
    sizes="100vw"
    loading="lazy"
    decoding="async"
    width="100px"
    height="100px"
    style="aspect-ratio: 4000 / 4000;"
  />
  ```

  #### Fixed-size Images

  When using images that are meant to be a fixed size, like showing a preview image of a product in the cart, instead of using `aspectRatio`, you'll instead declare `width` and `height` manually with fixed values. For example:

  ```jsx
  <Image data={data} width={80} height={80} />
  ```

  Instead of generating 15 images for a broad range of screen sizes, `Image` will instead only generate 3, for various screen pixel densities (1x, 2x, and 3x). The above example would result in the following HTML:

  ```html
  <img
    srcset="
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80&crop=center   1x,
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=160&height=160&crop=center 2x,
      https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=240&height=240&crop=center 3x
    "
    src="https://cdn.shopify.com/s/files/1/0551/4566/0472/products/Main.jpg?width=80&height=80"
    alt="alt text"
    loading="lazy"
    width="80px"
    height="80px"
    style="aspect-ratio: 80 / 80;"
  />
  ```

  If you don't want to have a fixed aspect ratio, and instead respect whatever is returned from your query, the following syntax can also be used:

  ```jsx
  <Image data={data} width="5rem" />
  ```

  Which would result in the same HTML as above, however the generated URLs inside the `src` and `srcset` attributes would not have `height` or `crop` parameters appended to them, and the generated `aspect-ratio` in `style` would be `4000 / 4000` (if using the same `data` values as our original example).

  #### Custom Loaders

  If your image isn't coming from the Storefront API, but you still want to take advantage of the `Image` component, you can pass a custom `loader` prop, provided the CDN you're working with supports URL-based transformations.

  The `loader` is a function which expects a `params` argument of the following type:

  ```ts
  type LoaderParams = {
    /** The base URL of the image */
    src?: ImageType['url'];
    /** The URL param that controls width */
    width?: number;
    /** The URL param that controls height */
    height?: number;
    /** The URL param that controls the cropping region */
    crop?: Crop;
  };
  ```

  Here is an example of using `Image` with a custom loader function:

  ```jsx
  const customLoader = ({src, width, height, crop}) => {
    return `${src}?w=${width}&h=${height}&gravity=${crop}`;
  };

  export default function CustomImage(props) {
    <Image loader={customLoader} {...props} />;
  }

  // In Use:

  <CustomImage data={customCDNImageData} />;
  ```

  If your CDN happens to support the same semantics as Shopify (URL params of `width`, `height`, and `crop`) — the default loader will work a non-Shopify `src` attribute.

  An example output might look like: `https://mycdn.com/image.jpeg?width=100&height=100&crop=center`

  ### Additional changes

  - Added the `srcSetOptions` prop used to create the image URLs used in `srcset`. It’s an object with the following keys and defaults:

    ```js
    srcSetOptions = {
      intervals: 15, // The number of sizes to generate
      startingWidth: 200, // The smalles image size
      incrementSize: 200, // The increment by to increase for each size, in pixesl
      placeholderWidth: 100, // The size used for placeholder fallback images
    };
    ```

  - Added an export for `IMAGE_FRAGMENT`, which can be imported from Hydrogen and used in any Storefront API query, which will fetch the required fields needed by the component.

  - Added an export for `shopifyLoader` for using Storefront API responses in conjunction with alternative frameworks that already have their own `Image` component, like Next.js

### Patch Changes

- Updated dependencies [[`82b6af7`](https://github.com/Shopify/hydrogen/commit/82b6af71cafe1f88c24630178e61cd09e5a59f5e), [`361879e`](https://github.com/Shopify/hydrogen/commit/361879ee11dfe8f1ee916b022165b1e7f0e45964)]:
  - @shopify/hydrogen-react@2023.4.0

## 2023.1.7

### Patch Changes

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

- Add an experimental `createWithCache_unstable` utility, which creates a function similar to `useQuery` from Hydrogen v1. Use this utility to query third-party APIs and apply custom cache options. ([#600](https://github.com/Shopify/hydrogen/pull/600)) by [@frandiox](https://github.com/frandiox)

  To setup the utility, update your `server.ts`:

  ```js
  import {
    createStorefrontClient,
    createWithCache_unstable,
    CacheLong,
  } from '@shopify/hydrogen';

  // ...

    const cache = await caches.open('hydrogen');
    const withCache = createWithCache_unstable({cache, waitUntil});

    // Create custom utilities to query third-party APIs:
    const fetchMyCMS = (query) => {
      // Prefix the cache key and make it unique based on arguments.
      return withCache(['my-cms', query], CacheLong(), () => {
        const cmsData = await (await fetch('my-cms.com/api', {
          method: 'POST',
          body: query
        })).json();

        const nextPage = (await fetch('my-cms.com/api', {
          method: 'POST',
          body: cmsData1.nextPageQuery,
        })).json();

        return {...cmsData, nextPage}
      });
    };

    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        session,
        waitUntil,
        storefront,
        env,
        fetchMyCMS,
      }),
    });
  ```

  **Note:** The utility is unstable and subject to change before stabalizing in the 2023.04 release.

- Updated dependencies [[`85ae63a`](https://github.com/Shopify/hydrogen/commit/85ae63ac37e5c4200919d8ae6c861c60effb4ded), [`5e26503`](https://github.com/Shopify/hydrogen/commit/5e2650374441fb5ae4840215fefdd5d547a378c0)]:
  - @shopify/hydrogen-react@2023.1.8

## 2023.1.6

### Patch Changes

- Add new `loader` API for setting seo tags within route module ([#591](https://github.com/Shopify/hydrogen/pull/591)) by [@cartogram](https://github.com/cartogram)

- `ShopPayButton` component now can receive a `storeDomain`. The component now does not require `ShopifyProvider`. ([#645](https://github.com/Shopify/hydrogen/pull/645)) by [@lordofthecactus](https://github.com/lordofthecactus)

- 1. Update Remix to 1.14.0 ([#599](https://github.com/Shopify/hydrogen/pull/599)) by [@blittle](https://github.com/blittle)

  1. Add `Cache-Control` defaults to all the demo store routes

- Added `robots` option to SEO config that allows users granular control over the robots meta tag. This can be set on both a global and per-page basis using the handle.seo property. ([#572](https://github.com/Shopify/hydrogen/pull/572)) by [@cartogram](https://github.com/cartogram)

  Example:

  ```ts
  export handle = {
    seo: {
      robots: {
        noIndex: false,
        noFollow: false,
      }
    }
  }
  ```

- Fix active cart session event in Live View ([#614](https://github.com/Shopify/hydrogen/pull/614)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Introducing `getStorefrontHeaders` that collects the required Shopify headers for making a
  Storefront API call.

  - Make cart constants available as exports from `@shopify/hydrogen-react`
  - Deprecating `buyerIp` and `requestGroupId` props from `createStorefrontClient` from `@shopify/hydrogen`
  - Deprecating `getBuyerIp` function from `@shopify/remix-oxygen`

  ```diff
  + import {getStorefrontHeaders} from '@shopify/remix-oxygen';
  import {createStorefrontClient, storefrontRedirect} from '@shopify/hydrogen';

  export default {
    async fetch(
      request: Request,
      env: Env,
      executionContext: ExecutionContext,
    ): Promise<Response> {

      const {storefront} = createStorefrontClient({
        cache,
        waitUntil,
  -     buyerIp: getBuyerIp(request),
        i18n: {language: 'EN', country: 'US'},
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
        storefrontId: env.PUBLIC_STOREFRONT_ID,
  -     requestGroupId: request.headers.get('request-id'),
  +     storefrontHeaders: getStorefrontHeaders(request),
      });
  ```

- Updated dependencies [[`c78f441`](https://github.com/Shopify/hydrogen/commit/c78f4410cccaf99d93b2a4e4fbd877fcaa2c1bce), [`7fca5d5`](https://github.com/Shopify/hydrogen/commit/7fca5d569be1d6749fdfa5ada6723d8186f0d775)]:
  - @shopify/hydrogen-react@2023.1.7

## 2023.1.5

### Patch Changes

- Fix the latest tag ([#562](https://github.com/Shopify/hydrogen/pull/562)) by [@blittle](https://github.com/blittle)

## 2023.1.4

### Patch Changes

- Fix template imports to only reference `@shopify/hydrogen`, not `@shopify/hydrogen-react` ([#523](https://github.com/Shopify/hydrogen/pull/523)) by [@blittle](https://github.com/blittle)

## 2023.1.3

### Patch Changes

- Send Hydrogen version in Storefront API requests. ([#471](https://github.com/Shopify/hydrogen/pull/471)) by [@frandiox](https://github.com/frandiox)

- Fix default Storefront type in LoaderArgs. ([#496](https://github.com/Shopify/hydrogen/pull/496)) by [@frandiox](https://github.com/frandiox)

## 2023.1.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

## 2023.1.1

### Patch Changes

- Initial release
