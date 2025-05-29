# search



## Requirements

To implement Shopify's predictive search feature, you need to install a search & discovery app via the Shopify admin.
In this recipe, we'll use the [Shopify Search & Discovery app](https://apps.shopify.com/search-and-discovery).

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/Aside.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/Aside.tsx) |  |
| [app/components/Header.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/Header.tsx) |  |
| [app/components/SearchForm.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchForm.tsx) |  |
| [app/components/SearchFormPredictive.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchFormPredictive.tsx) |  |
| [app/components/SearchResults.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchResults.tsx) |  |
| [app/components/SearchResultsPredictive.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchResultsPredictive.tsx) |  |
| [app/lib/search.ts](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/lib/search.ts) |  |
| [app/routes/search.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/routes/search.tsx) |  |

## Steps

### Step 1: Add the <SearchAside /> component to the <PageLayout />



#### File: [app/components/PageLayout.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/components/PageLayout.tsx)

<details>

```diff
index 2f602b60..6c11cb22 100644
--- a/templates/skeleton/app/components/PageLayout.tsx
+++ b/templates/skeleton/app/components/PageLayout.tsx
@@ -1,7 +1,127 @@
+import {Link} from 'react-router';
+import {useId} from 'react';
+import type {
+  CartApiQueryFragment,
+  FooterQuery,
+  HeaderQuery,
+} from 'storefrontapi.generated';
+import {Aside} from '~/components/Aside';
+import {Header} from '~/components/Header';
+import {
+  SEARCH_ENDPOINT,
+  SearchFormPredictive,
+} from '~/components/SearchFormPredictive';
+import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
+
 interface PageLayoutProps {
+  cart: Promise<CartApiQueryFragment | null>;
+  header: HeaderQuery;
+  isLoggedIn: Promise<boolean>;
+  publicStoreDomain: string;
   children?: React.ReactNode;
 }
 
-export function PageLayout({children = null}: PageLayoutProps) {
-  return <main>{children}</main>;
+export function PageLayout({
+  cart,
+  children = null,
+  header,
+  isLoggedIn,
+  publicStoreDomain,
+}: PageLayoutProps) {
+  return (
+    <Aside.Provider>
+      <SearchAside />
+      {header && (
+        <Header
+          header={header}
+          cart={cart}
+          isLoggedIn={isLoggedIn}
+          publicStoreDomain={publicStoreDomain}
+        />
+      )}
+      <main>{children}</main>
+    </Aside.Provider>
+  );
+}
+
+function SearchAside() {
+  const queriesDatalistId = useId();
+  return (
+    <Aside type="search" heading="SEARCH">
+      <div className="predictive-search">
+        <br />
+        <SearchFormPredictive>
+          {({fetchResults, goToSearch, inputRef}) => (
+            <>
+              <input
+                name="q"
+                onChange={fetchResults}
+                onFocus={fetchResults}
+                placeholder="Search"
+                ref={inputRef}
+                type="search"
+                list={queriesDatalistId}
+              />
+              &nbsp;
+              <button onClick={goToSearch}>Search</button>
+            </>
+          )}
+        </SearchFormPredictive>
+
+        <SearchResultsPredictive>
+          {({items, total, term, state, closeSearch}) => {
+            const {articles, collections, pages, products, queries} = items;
+
+            if (state === 'loading' && term.current) {
+              return <div>Loading...</div>;
+            }
+
+            if (!total) {
+              return <SearchResultsPredictive.Empty term={term} />;
+            }
+
+            return (
+              <>
+                <SearchResultsPredictive.Queries
+                  queries={queries}
+                  queriesDatalistId={queriesDatalistId}
+                />
+                <SearchResultsPredictive.Products
+                  products={products}
+                  closeSearch={closeSearch}
+                  term={term}
+                />
+                <SearchResultsPredictive.Collections
+                  collections={collections}
+                  closeSearch={closeSearch}
+                  term={term}
+                />
+                <SearchResultsPredictive.Pages
+                  pages={pages}
+                  closeSearch={closeSearch}
+                  term={term}
+                />
+                <SearchResultsPredictive.Articles
+                  articles={articles}
+                  closeSearch={closeSearch}
+                  term={term}
+                />
+                {term.current && total ? (
+                  <Link
+                    onClick={closeSearch}
+                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
+                  >
+                    <p>
+                      View all results for <q>{term.current}</q>
+                      &nbsp; →
+                    </p>
+                  </Link>
+                ) : null}
+              </>
+            );
+          }}
+        </SearchResultsPredictive>
+      </div>
+    </Aside>
+  );
 }
```

</details>

### Step 1: Create the <Aside /> component (if needed) to display the predictive search sliding drawer



#### File: [Aside.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/Aside.tsx)

<details>

```tsx
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;

  useEffect(() => {
    const abortController = new AbortController();

    if (expanded) {
      document.addEventListener(
        'keydown',
        function handler(event: KeyboardEvent) {
          if (event.key === 'Escape') {
            close();
          }
        },
        {signal: abortController.signal},
      );
    }
    return () => abortController.abort();
  }, [close, expanded]);

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={close} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <button className="close reset" onClick={close} aria-label="Close">
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}

```

</details>

### Step 2: Add the search and predictive search queries to the fragments



#### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/lib/fragments.ts)

<details>

```diff
index e69de29b..dc5254be 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -0,0 +1,56 @@
+const MENU_FRAGMENT = `#graphql
+  fragment MenuItem on MenuItem {
+    id
+    resourceId
+    tags
+    title
+    type
+    url
+  }
+  fragment ChildMenuItem on MenuItem {
+    ...MenuItem
+  }
+  fragment ParentMenuItem on MenuItem {
+    ...MenuItem
+    items {
+      ...ChildMenuItem
+    }
+  }
+  fragment Menu on Menu {
+    id
+    items {
+      ...ParentMenuItem
+    }
+  }
+` as const;
+
+export const HEADER_QUERY = `#graphql
+  fragment Shop on Shop {
+    id
+    name
+    description
+    primaryDomain {
+      url
+    }
+    brand {
+      logo {
+        image {
+          url
+        }
+      }
+    }
+  }
+  query Header(
+    $country: CountryCode
+    $headerMenuHandle: String!
+    $language: LanguageCode
+  ) @inContext(language: $language, country: $country) {
+    shop {
+      ...Shop
+    }
+    menu(handle: $headerMenuHandle) {
+      ...Menu
+    }
+  }
+  ${MENU_FRAGMENT}
+` as const;
```

</details>

### Step 2: Create or update the Header file (if needed) to later add the <SearchToggle /> icon



#### File: [Header.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/Header.tsx)

<details>

```tsx
import {NavLink} from 'react-router';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        <strong>{shop.name}</strong>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <HeaderCtas cart={cart} />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={close}
          prefetch="intent"
          style={activeLinkStyle}
          to="/"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas() {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <SearchToggle />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
    >
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
    </button>
  );
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'black',
  };
}

```

</details>

### Step 3: (optional) Add the header menu queries to the root layout



#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/root.tsx)

```diff
index 543380c7..c4a449f6 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -1,4 +1,4 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {getShopAnalytics, useNonce} from '@shopify/hydrogen';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
   Outlet,
@@ -15,6 +15,7 @@ import favicon from '~/assets/favicon.svg';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
+import {HEADER_QUERY} from '~/lib/fragments';
 
 export type RootLoader = typeof loader;
 
@@ -74,6 +75,7 @@ export async function loader(args: LoaderFunctionArgs) {
   const {storefront, env} = args.context;
 
   return {
+    ...criticalData,
     ...deferredData,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
@@ -96,7 +98,19 @@ export async function loader(args: LoaderFunctionArgs) {
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
 async function loadCriticalData({context}: LoaderFunctionArgs) {
-  return {};
+  const {storefront} = context;
+
+  const [header] = await Promise.all([
+    storefront.query(HEADER_QUERY, {
+      cache: storefront.CacheLong(),
+      variables: {
+        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
+      },
+    }),
+    // Add other queries here, so that they are loaded in parallel
+  ]);
+
+  return {header};
 }
 
 /**
```

### Step 3: Create the <SearchForm /> component which captures the search input from the user



#### File: [SearchForm.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchForm.tsx)

<details>

```tsx
import {useRef, useEffect} from 'react';
import { Form, type FormProps } from 'react-router';

type SearchFormProps = Omit<FormProps, 'children'> & {
  children: (args: {
    inputRef: React.RefObject<HTMLInputElement>;
  }) => React.ReactNode;
};

/**
 * Search form component that sends search requests to the `/search` route.
 * @example
 * ```tsx
 * <SearchForm>
 *  {({inputRef}) => (
 *    <>
 *      <input
 *        ref={inputRef}
 *        type="search"
 *        defaultValue={term}
 *        name="q"
 *        placeholder="Search…"
 *      />
 *      <button type="submit">Search</button>
 *   </>
 *  )}
 *  </SearchForm>
 */
export function SearchForm({children, ...props}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusOnCmdK(inputRef);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <Form method="get" {...props}>
      {children({inputRef})}
    </Form>
  );
}

/**
 * Focuses the input when cmd+k is pressed
 */
function useFocusOnCmdK(inputRef: React.RefObject<HTMLInputElement>) {
  // focus the input when cmd+k is pressed
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef]);
}

```

</details>

### Step 4: Create the <SearchFormPredictive /> component to capture the input on the sliding predictive search drawer



#### File: [SearchFormPredictive.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchFormPredictive.tsx)

<details>

```tsx
import { useFetcher, useNavigate, type FormProps, type Fetcher } from 'react-router';
import React, {useRef, useEffect} from 'react';
import type {PredictiveSearchReturn} from '~/lib/search';
import {useAside} from './Aside';

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  goToSearch: () => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  fetcher: Fetcher<PredictiveSearchReturn>;
}) => React.ReactNode;

type SearchFormPredictiveProps = Omit<FormProps, 'children'> & {
  children: SearchFormPredictiveChildren | null;
};

export const SEARCH_ENDPOINT = '/search';

/**
 *  Search form component that sends search requests to the `/search` route
 **/
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFormPredictiveProps) {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const aside = useAside();

  /** Reset the input value and blur the input */
  function resetInput(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef?.current?.value) {
      inputRef.current.blur();
    }
  }

  /** Navigate to the search page with the current input value */
  function goToSearch() {
    const term = inputRef?.current?.value;
    navigate(SEARCH_ENDPOINT + (term ? `?q=${term}` : ''));
    aside.close();
  }

  /** Fetch search results based on the input value */
  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    fetcher.submit(
      {q: event.target.value || '', limit: 5, predictive: true},
      {method: 'GET', action: SEARCH_ENDPOINT},
    );
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <fetcher.Form {...props} className={className} onSubmit={resetInput}>
      {children({inputRef, fetcher, fetchResults, goToSearch})}
    </fetcher.Form>
  );
}

```

</details>

### Step 5: Create the <SearchResults /> component to render the search results in the /search route



#### File: [SearchResults.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchResults.tsx)

<details>

```tsx
import { Link } from 'react-router';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Articles</h2>
      <div>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <div className="search-results-item" key={article.id}>
              <Link prefetch="intent" to={articleUrl}>
                {article.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Pages</h2>
      <div>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <div className="search-results-item" key={page.id}>
              <Link prefetch="intent" to={pageUrl}>
                {page.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
}

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

            const price = product?.selectedOrFirstAvailableVariant?.price;
            const image = product?.selectedOrFirstAvailableVariant?.image;

            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
                  {image && (
                    <Image
                      data={image}
                      alt={product.title}
                      width={50}
                    />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>
                      {price &&
                        <Money data={price} />
                      }
                    </small>
                  </div>
                </Link>
              </div>
            );
          });

          return (
            <div>
              <div>
                <PreviousLink>
                  {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
                </PreviousLink>
              </div>
              <div>
                {ItemsMarkup}
                <br />
              </div>
              <div>
                <NextLink>
                  {isLoading ? 'Loading...' : <span>Load more ↓</span>}
                </NextLink>
              </div>
            </div>
          );
        }}
      </Pagination>
      <br />
    </div>
  );
}

function SearchResultsEmpty() {
  return <p>No results, try a different search.</p>;
}

```

</details>

### Step 6: Create the <SearchResultsPredictive /> component to render search results in the <SearchAside />



#### File: [SearchResultsPredictive.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/components/SearchResultsPredictive.tsx)

<details>

```tsx
import { Link, useFetcher, type Fetcher } from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';
import {
  getEmptyPredictiveSearchResult,
  urlWithTrackingParams,
  type PredictiveSearchReturn,
} from '~/lib/search';
import {useAside} from './Aside';

type PredictiveSearchItems = PredictiveSearchReturn['result']['items'];

type UsePredictiveSearchReturn = {
  term: React.MutableRefObject<string>;
  total: number;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  items: PredictiveSearchItems;
  fetcher: Fetcher<PredictiveSearchReturn>;
};

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  'term' | 'total' | 'inputRef' | 'items'
> & {
  state: Fetcher['state'];
  closeSearch: () => void;
};

type PartialPredictiveSearchResult<
  ItemType extends keyof PredictiveSearchItems,
  ExtraProps extends keyof SearchResultsPredictiveArgs = 'term' | 'closeSearch',
> = Pick<PredictiveSearchItems, ItemType> &
  Pick<SearchResultsPredictiveArgs, ExtraProps>;

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
};

/**
 * Component that renders predictive search results
 */
export function SearchResultsPredictive({
  children,
}: SearchResultsPredictiveProps) {
  const aside = useAside();
  const {term, inputRef, fetcher, total, items} = usePredictiveSearch();

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.value = '';
    }
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput();
    aside.close();
  }

  return children({
    items,
    closeSearch,
    inputRef,
    state: fetcher.state,
    term,
    total,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;

function SearchResultsPredictiveArticles({
  term,
  articles,
  closeSearch,
}: PartialPredictiveSearchResult<'articles'>) {
  if (!articles.length) return null;

  return (
    <div className="predictive-search-result" key="articles">
      <h5>Articles</h5>
      <ul>
        {articles.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.blog.handle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term: term.current ?? '',
          });

          return (
            <li className="predictive-search-result-item" key={article.id}>
              <Link onClick={closeSearch} to={articleUrl}>
                {article.image?.url && (
                  <Image
                    alt={article.image.altText ?? ''}
                    src={article.image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <span>{article.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictiveCollections({
  term,
  collections,
  closeSearch,
}: PartialPredictiveSearchResult<'collections'>) {
  if (!collections.length) return null;

  return (
    <div className="predictive-search-result" key="collections">
      <h5>Collections</h5>
      <ul>
        {collections.map((collection) => {
          const collectionUrl = urlWithTrackingParams({
            baseUrl: `/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term: term.current,
          });

          return (
            <li className="predictive-search-result-item" key={collection.id}>
              <Link onClick={closeSearch} to={collectionUrl}>
                {collection.image?.url && (
                  <Image
                    alt={collection.image.altText ?? ''}
                    src={collection.image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <span>{collection.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictivePages({
  term,
  pages,
  closeSearch,
}: PartialPredictiveSearchResult<'pages'>) {
  if (!pages.length) return null;

  return (
    <div className="predictive-search-result" key="pages">
      <h5>Pages</h5>
      <ul>
        {pages.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term: term.current,
          });

          return (
            <li className="predictive-search-result-item" key={page.id}>
              <Link onClick={closeSearch} to={pageUrl}>
                <div>
                  <span>{page.title}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

          const price = product?.selectedOrFirstAvailableVariant?.price;
          const image = product?.selectedOrFirstAvailableVariant?.image;
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
                    {price && (
                      <Money data={price} />
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

function SearchResultsPredictiveQueries({
  queries,
  queriesDatalistId,
}: PartialPredictiveSearchResult<'queries', never> & {
  queriesDatalistId: string;
}) {
  if (!queries.length) return null;

  return (
    <datalist id={queriesDatalistId}>
      {queries.map((suggestion) => {
        if (!suggestion) return null;

        return <option key={suggestion.text} value={suggestion.text} />;
      })}
    </datalist>
  );
}

function SearchResultsPredictiveEmpty({
  term,
}: {
  term: React.MutableRefObject<string>;
}) {
  if (!term.current) {
    return null;
  }

  return (
    <p>
      No results found for <q>{term.current}</q>
    </p>
  );
}

/**
 * Hook that returns the predictive search results and fetcher and input ref.
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher } = usePredictiveSearch();
 * '''
 **/
function usePredictiveSearch(): UsePredictiveSearchReturn {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const term = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (fetcher?.state === 'loading') {
    term.current = String(fetcher.formData?.get('q') || '');
  }

  // capture the search input element as a ref
  useEffect(() => {
    if (!inputRef.current) {
      inputRef.current = document.querySelector('input[type="search"]');
    }
  }, []);

  const {items, total} =
    fetcher?.data?.result ?? getEmptyPredictiveSearchResult();

  return {items, total, inputRef, term, fetcher};
}

```

</details>

### Step 7: Create the search.ts lib utility



#### File: [search.ts](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/lib/search.ts)

<details>

```ts
import type {
  PredictiveSearchQuery,
  RegularSearchQuery,
} from 'storefrontapi.generated';

type ResultWithItems<Type extends 'predictive' | 'regular', Items> = {
  type: Type;
  term: string;
  error?: string;
  result: {total: number; items: Items};
};

export type RegularSearchReturn = ResultWithItems<
  'regular',
  RegularSearchQuery
>;
export type PredictiveSearchReturn = ResultWithItems<
  'predictive',
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>;

/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

interface UrlWithTrackingParams {
  /** The base URL to which the tracking parameters will be appended. */
  baseUrl: string;
  /** The trackingParams returned by the Storefront API. */
  trackingParams?: string | null;
  /** Any additional query parameters to be appended to the URL. */
  params?: Record<string, string>;
  /** The search term to be appended to the URL. */
  term: string;
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: UrlWithTrackingParams) {
  let search = new URLSearchParams({
    ...extraParams,
    q: encodeURIComponent(term),
  }).toString();

  if (trackingParams) {
    search = `${search}&${trackingParams}`;
  }

  return `${baseUrl}?${search}`;
}

```

</details>

### Step 8: Create the /search route to display regular search results



#### File: [search.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/search/ingredients/templates/skeleton/app/routes/search.tsx)

<details>

```tsx
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {SearchForm} from '~/components/SearchForm';
import {SearchResults} from '~/components/SearchResults';
import {
  type RegularSearchReturn,
  type PredictiveSearchReturn,
  getEmptyPredictiveSearchResult,
} from '~/lib/search';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Search`}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');
  const searchPromise: Promise<PredictiveSearchReturn | RegularSearchReturn> =
    isPredictive
      ? predictiveSearch({request, context})
      : regularSearch({request, context});

  searchPromise.catch((error: Error) => {
    console.error(error);
    return {term: '', result: null, error: error.message};
  });

  return await searchPromise;
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const {type, term, result, error} = useLoaderData<typeof loader>();
  if (type === 'predictive') return null;

  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm>
        {({inputRef}) => (
          <>
            <input
              defaultValue={term}
              name="q"
              placeholder="Search…"
              ref={inputRef}
              type="search"
            />
            &nbsp;
            <button type="submit">Search</button>
          </>
        )}
      </SearchForm>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {!term || !result?.total ? (
        <SearchResults.Empty />
      ) : (
        <SearchResults result={result} term={term}>
          {({articles, pages, products, term}) => (
            <div>
              <SearchResults.Products products={products} term={term} />
              <SearchResults.Pages pages={pages} term={term} />
              <SearchResults.Articles articles={articles} term={term} />
            </div>
          )}
        </SearchResults>
      )}
      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
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
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const;

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
}: Pick<
  LoaderFunctionArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const term = String(url.searchParams.get('q') || '');

  // Search articles, pages, and products for the `q` term
  const {errors, ...items} = await storefront.query(SEARCH_QUERY, {
    variables: {...variables, term},
  });

  if (!items) {
    throw new Error('No search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc, {nodes}) => acc + nodes.length,
    0,
  );

  const error = errors
    ? errors.map(({message}) => message).join(', ')
    : undefined;

  return {type: 'regular', term, error, result: {total, items}};
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
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
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  ActionFunctionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {predictiveSearch: items, errors} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    },
  );

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc, item) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}

```

</details>

## Next steps

- Test your predictive search implementation by clicking the search toggle in the header and entering a search query.
- Test your regular search implementation by going to /search and entering a search query.