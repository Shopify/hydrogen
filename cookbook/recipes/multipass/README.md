# 🧑‍🍳 Multipass

This folder contains an example implementation of [Multipass](https://shopify.dev/docs/api/multipass) for Hydrogen. It shows how to persist the user session from a Hydrogen storefront through to checkout.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/Cart.tsx`](ingredients/templates/skeleton/app/components/Cart.tsx) | A component that displays the cart. |
| [`app/components/MultipassCheckoutButton.tsx`](ingredients/templates/skeleton/app/components/MultipassCheckoutButton.tsx) | This component attempts to persist the customer session state in the checkout by using multipass. Note: multipass checkout is a Shopify Plus+ feature only. |
| [`app/lib/multipass/multipass.ts`](ingredients/templates/skeleton/app/lib/multipass/multipass.ts) | A utility that makes a POST request to the local `/account/login/multipass` endpoint to retrieve a multipass `url` and `token` for a given url/customer combination. |
| [`app/lib/multipass/multipassify.server.ts`](ingredients/templates/skeleton/app/lib/multipass/multipassify.server.ts) | A utility that generates and parses multipass tokens. |
| [`app/lib/multipass/types.ts`](ingredients/templates/skeleton/app/lib/multipass/types.ts) | Types for the multipass and multipassify utilities. |
| [`app/routes/account_.activate.$id.$activationToken.tsx`](ingredients/templates/skeleton/app/routes/account_.activate.$id.$activationToken.tsx) | A route that activates a customer account. |
| [`app/routes/account_.login.multipass.tsx`](ingredients/templates/skeleton/app/routes/account_.login.multipass.tsx) | A route that generates a multipass token for a given customer and return_to url. |
| [`app/routes/account_.recover.tsx`](ingredients/templates/skeleton/app/routes/account_.recover.tsx) | A route that displays a recover password form. |
| [`app/routes/account_.register.tsx`](ingredients/templates/skeleton/app/routes/account_.register.tsx) | A route that displays a register form. |
| [`app/routes/account_.reset.$id.$resetToken.tsx`](ingredients/templates/skeleton/app/routes/account_.reset.$id.$resetToken.tsx) | A route that displays a reset password form. |

## 🍱 Steps

### 1. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/Cart.tsx`
- `app/components/MultipassCheckoutButton.tsx`
- `app/lib/multipass/multipass.ts`
- `app/lib/multipass/multipassify.server.ts`
- `app/lib/multipass/types.ts`
- `app/routes/account_.activate.$id.$activationToken.tsx`
- `app/routes/account_.login.multipass.tsx`
- `app/routes/account_.recover.tsx`
- `app/routes/account_.register.tsx`
- `app/routes/account_.reset.$id.$resetToken.tsx`

### 2. app/components/Header.tsx



#### File: [`app/components/Header.tsx`](/templates/skeleton/app/components/Header.tsx)

<details>

```diff
index 8a437a10..accb67e1 100644
--- a/templates/skeleton/app/components/Header.tsx
+++ b/templates/skeleton/app/components/Header.tsx
@@ -1,17 +1,13 @@
 import {Suspense} from 'react';
-import {Await, NavLink, useAsyncValue} from '@remix-run/react';
-import {
-  type CartViewPayload,
-  useAnalytics,
-  useOptimisticCart,
-} from '@shopify/hydrogen';
+import {Await, NavLink} from '@remix-run/react';
+import {type CartViewPayload, useAnalytics} from '@shopify/hydrogen';
 import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
 import {useAside} from '~/components/Aside';
 
 interface HeaderProps {
   header: HeaderQuery;
   cart: Promise<CartApiQueryFragment | null>;
-  isLoggedIn: Promise<boolean>;
+  isLoggedIn: boolean;
   publicStoreDomain: string;
 }
 
@@ -52,14 +48,20 @@ export function HeaderMenu({
   publicStoreDomain: HeaderProps['publicStoreDomain'];
 }) {
   const className = `header-menu-${viewport}`;
-  const {close} = useAside();
+
+  function closeAside(event: React.MouseEvent<HTMLAnchorElement>) {
+    if (viewport === 'mobile') {
+      event.preventDefault();
+      window.location.href = event.currentTarget.href;
+    }
+  }
 
   return (
     <nav className={className} role="navigation">
       {viewport === 'mobile' && (
         <NavLink
           end
-          onClick={close}
+          onClick={closeAside}
           prefetch="intent"
           style={activeLinkStyle}
           to="/"
@@ -82,7 +84,7 @@ export function HeaderMenu({
             className="header-menu-item"
             end
             key={item.id}
-            onClick={close}
+            onClick={closeAside}
             prefetch="intent"
             style={activeLinkStyle}
             to={url}
@@ -103,11 +105,7 @@ function HeaderCtas({
     <nav className="header-ctas" role="navigation">
       <HeaderMenuMobileToggle />
       <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
-        <Suspense fallback="Sign in">
-          <Await resolve={isLoggedIn} errorElement="Sign in">
-            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
-          </Await>
-        </Suspense>
+        {isLoggedIn ? 'Account' : 'Sign in'}
       </NavLink>
       <SearchToggle />
       <CartToggle cart={cart} />
@@ -136,7 +134,7 @@ function SearchToggle() {
   );
 }
 
-function CartBadge({count}: {count: number | null}) {
+function CartBadge({count}: {count: number}) {
   const {open} = useAside();
   const {publish, shop, cart, prevCart} = useAnalytics();
 
@@ -154,27 +152,24 @@ function CartBadge({count}: {count: number | null}) {
         } as CartViewPayload);
       }}
     >
-      Cart {count === null ? <span>&nbsp;</span> : count}
+      Cart {count}
     </a>
   );
 }
 
 function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
   return (
-    <Suspense fallback={<CartBadge count={null} />}>
+    <Suspense fallback={<CartBadge count={0} />}>
       <Await resolve={cart}>
-        <CartBanner />
+        {(cart) => {
+          if (!cart) return <CartBadge count={0} />;
+          return <CartBadge count={cart.totalQuantity || 0} />;
+        }}
       </Await>
     </Suspense>
   );
 }
 
-function CartBanner() {
-  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
-  const cart = useOptimisticCart(originalCart);
-  return <CartBadge count={cart?.totalQuantity ?? 0} />;
-}
-
 const FALLBACK_HEADER_MENU = {
   id: 'gid://shopify/Menu/199655587896',
   items: [

```

</details>

### 3. app/components/PageLayout.tsx



#### File: [`app/components/PageLayout.tsx`](/templates/skeleton/app/components/PageLayout.tsx)

<details>

```diff
index d6a808b5..cae727f5 100644
--- a/templates/skeleton/app/components/PageLayout.tsx
+++ b/templates/skeleton/app/components/PageLayout.tsx
@@ -1,5 +1,5 @@
-import {Await, Link} from '@remix-run/react';
-import {Suspense, useId} from 'react';
+import {Await} from '@remix-run/react';
+import {Suspense} from 'react';
 import type {
   CartApiQueryFragment,
   FooterQuery,
@@ -8,18 +8,13 @@ import type {
 import {Aside} from '~/components/Aside';
 import {Footer} from '~/components/Footer';
 import {Header, HeaderMenu} from '~/components/Header';
-import {CartMain} from '~/components/CartMain';
-import {
-  SEARCH_ENDPOINT,
-  SearchFormPredictive,
-} from '~/components/SearchFormPredictive';
-import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
+import {CartMain} from '~/components/Cart';
 
 interface PageLayoutProps {
   cart: Promise<CartApiQueryFragment | null>;
-  footer: Promise<FooterQuery | null>;
+  footer: Promise<FooterQuery>;
   header: HeaderQuery;
-  isLoggedIn: Promise<boolean>;
+  isLoggedIn: boolean;
   publicStoreDomain: string;
   children?: React.ReactNode;
 }
@@ -35,7 +30,6 @@ export function PageLayout({
   return (
     <Aside.Provider>
       <CartAside cart={cart} />
-      <SearchAside />
       <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
       {header && (
         <Header
@@ -69,88 +63,6 @@ function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
   );
 }
 
-function SearchAside() {
-  const queriesDatalistId = useId();
-  return (
-    <Aside type="search" heading="SEARCH">
-      <div className="predictive-search">
-        <br />
-        <SearchFormPredictive>
-          {({fetchResults, goToSearch, inputRef}) => (
-            <>
-              <input
-                name="q"
-                onChange={fetchResults}
-                onFocus={fetchResults}
-                placeholder="Search"
-                ref={inputRef}
-                type="search"
-                list={queriesDatalistId}
-              />
-              &nbsp;
-              <button onClick={goToSearch}>Search</button>
-            </>
-          )}
-        </SearchFormPredictive>
-
-        <SearchResultsPredictive>
-          {({items, total, term, state, closeSearch}) => {
-            const {articles, collections, pages, products, queries} = items;
-
-            if (state === 'loading' && term.current) {
-              return <div>Loading...</div>;
-            }
-
-            if (!total) {
-              return <SearchResultsPredictive.Empty term={term} />;
-            }
-
-            return (
-              <>
-                <SearchResultsPredictive.Queries
-                  queries={queries}
-                  queriesDatalistId={queriesDatalistId}
-                />
-                <SearchResultsPredictive.Products
-                  products={products}
-                  closeSearch={closeSearch}
-                  term={term}
-                />
-                <SearchResultsPredictive.Collections
-                  collections={collections}
-                  closeSearch={closeSearch}
-                  term={term}
-                />
-                <SearchResultsPredictive.Pages
-                  pages={pages}
-                  closeSearch={closeSearch}
-                  term={term}
-                />
-                <SearchResultsPredictive.Articles
-                  articles={articles}
-                  closeSearch={closeSearch}
-                  term={term}
-                />
-                {term.current && total ? (
-                  <Link
-                    onClick={closeSearch}
-                    to={`${SEARCH_ENDPOINT}?q=${term.current}`}
-                  >
-                    <p>
-                      View all results for <q>{term.current}</q>
-                      &nbsp; →
-                    </p>
-                  </Link>
-                ) : null}
-              </>
-            );
-          }}
-        </SearchResultsPredictive>
-      </div>
-    </Aside>
-  );
-}
-
 function MobileMenuAside({
   header,
   publicStoreDomain,

```

</details>

### 4. app/root.tsx

- validate the customer access token is valid.
- defer the footer query (below the fold).
- await the header query (above the fold).
- Adjust to your header menu handle.

#### File: [`app/root.tsx`](/templates/skeleton/app/root.tsx)

<details>

```diff
index a4f7c673..988cb27e 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -1,5 +1,9 @@
 import {useNonce, getShopAnalytics, Analytics} from '@shopify/hydrogen';
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import {
+  data,
+  type HeadersFunction,
+  type LoaderFunctionArgs,
+} from '@shopify/remix-oxygen';
 import {
   Links,
   Meta,
@@ -11,6 +15,7 @@ import {
   isRouteErrorResponse,
   type ShouldRevalidateFunction,
 } from '@remix-run/react';
+import type {CustomerAccessToken} from '@shopify/hydrogen/storefront-api-types';
 import favicon from '~/assets/favicon.svg';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
@@ -65,80 +70,60 @@ export function links() {
   ];
 }
 
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
+export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;
 
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+export async function loader({context}: LoaderFunctionArgs) {
+  const {storefront, customerAccount, cart, env} = context;
+  const publicStoreDomain = env.PUBLIC_STORE_DOMAIN;
 
-  const {storefront, env} = args.context;
+  const customerAccessToken = await context.session.get('customerAccessToken');
 
-  return {
-    ...deferredData,
-    ...criticalData,
-    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
-    shop: getShopAnalytics({
-      storefront,
-      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
-    }),
-    consent: {
-      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
-      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
-      withPrivacyBanner: false,
-      // localize the privacy banner
-      country: args.context.storefront.i18n.country,
-      language: args.context.storefront.i18n.language,
-    },
-  };
-}
+  // validate the customer access token is valid
+  const {isLoggedIn, headers} = await validateCustomerAccessToken(
+    context.session,
+    customerAccessToken,
+  );
 
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
+  const cartPromise = cart.get();
 
   // defer the footer query (below the fold)
-  const footer = storefront
-    .query(FOOTER_QUERY, {
-      cache: storefront.CacheLong(),
-      variables: {
-        footerMenuHandle: 'footer', // Adjust to your footer menu handle
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
+
+  return data(
+    {
+      cart: cartPromise,
+      footer: footerPromise,
+      header: await headerPromise,
+      isLoggedIn,
+      publicStoreDomain,
+      shop: getShopAnalytics({
+        storefront,
+        publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
+      }),
+      consent: {
+        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
+        storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+        withPrivacyBanner: true,
+        // localize the privacy banner
+        country: context.storefront.i18n.country,
+        language: context.storefront.i18n.language,
       },
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
-  };
+    },
+    {headers},
+  );
 }
 
 export function Layout({children}: {children?: React.ReactNode}) {
@@ -202,3 +187,38 @@ export function ErrorBoundary() {
     </div>
   );
 }
+
+/**
+ * Validates the customer access token and returns a boolean and headers
+ * @see https://shopify.dev/docs/api/storefront/latest/objects/CustomerAccessToken
+ *
+ * @example
+ * ```js
+ * const {isLoggedIn, headers} = await validateCustomerAccessToken(
+ *  customerAccessToken,
+ *  session,
+ * );
+ * ```
+ */
+async function validateCustomerAccessToken(
+  session: LoaderFunctionArgs['context']['session'],
+  customerAccessToken?: CustomerAccessToken,
+) {
+  let isLoggedIn = false;
+  const headers = new Headers();
+  if (!customerAccessToken?.accessToken || !customerAccessToken?.expiresAt) {
+    return {isLoggedIn, headers};
+  }
+
+  const expiresAt = new Date(customerAccessToken.expiresAt).getTime();
+  const dateNow = Date.now();
+  const customerAccessTokenExpired = expiresAt < dateNow;
+
+  if (customerAccessTokenExpired) {
+    session.unset('customerAccessToken');
+  } else {
+    isLoggedIn = true;
+  }
+
+  return {isLoggedIn, headers};
+}

```

</details>

### 5. app/routes/account.$.tsx



#### File: [`app/routes/account.$.tsx`](/templates/skeleton/app/routes/account.$.tsx)

```diff
index 53543f62..8b14aaa7 100644
--- a/templates/skeleton/app/routes/account.$.tsx
+++ b/templates/skeleton/app/routes/account.$.tsx
@@ -1,8 +1,8 @@
 import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 
-// fallback wild card for all unauthenticated routes in account section
 export async function loader({context}: LoaderFunctionArgs) {
-  await context.customerAccount.handleAuthStatus();
-
-  return redirect('/account');
+  if (await context.session.get('customerAccessToken')) {
+    return redirect('/account');
+  }
+  return redirect('/account/login');
 }

```

### 6. app/routes/account.addresses.tsx



#### File: [`app/routes/account.addresses.tsx`](/templates/skeleton/app/routes/account.addresses.tsx)

<details>

```diff
index 14cd1f3f..76ae8b40 100644
--- a/templates/skeleton/app/routes/account.addresses.tsx
+++ b/templates/skeleton/app/routes/account.addresses.tsx
@@ -1,10 +1,8 @@
-import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
-import type {
-  AddressFragment,
-  CustomerFragment,
-} from 'customer-accountapi.generated';
+import type {MailingAddressInput} from '@shopify/hydrogen/storefront-api-types';
+import type {AddressFragment, CustomerFragment} from 'storefrontapi.generated';
 import {
   data,
+  redirect,
   type ActionFunctionArgs,
   type LoaderFunctionArgs,
 } from '@shopify/remix-oxygen';
@@ -14,13 +12,7 @@ import {
   useNavigation,
   useOutletContext,
   type MetaFunction,
-  type Fetcher,
 } from '@remix-run/react';
-import {
-  UPDATE_ADDRESS_MUTATION,
-  DELETE_ADDRESS_MUTATION,
-  CREATE_ADDRESS_MUTATION,
-} from '~/graphql/customer-account/CustomerAddressMutations';
 
 export type ActionResponse = {
   addressId?: string | null;
@@ -36,13 +28,16 @@ export const meta: MetaFunction = () => {
 };
 
 export async function loader({context}: LoaderFunctionArgs) {
-  await context.customerAccount.handleAuthStatus();
-
+  const {session} = context;
+  const customerAccessToken = await session.get('customerAccessToken');
+  if (!customerAccessToken) {
+    return redirect('/account/login');
+  }
   return {};
 }
 
 export async function action({request, context}: ActionFunctionArgs) {
-  const {customerAccount} = context;
+  const {storefront, session} = context;
 
   try {
     const form = await request.formData();
@@ -54,31 +49,26 @@ export async function action({request, context}: ActionFunctionArgs) {
       throw new Error('You must provide an address id.');
     }
 
-    // this will ensure redirecting to login never happen for mutatation
-    const isLoggedIn = await customerAccount.isLoggedIn();
-    if (!isLoggedIn) {
-      return data(
-        {error: {[addressId]: 'Unauthorized'}},
-        {
-          status: 401,
-        },
-      );
+    const customerAccessToken = await session.get('customerAccessToken');
+    if (!customerAccessToken) {
+      return data({error: {[addressId]: 'Unauthorized'}}, {status: 401});
     }
+    const {accessToken} = customerAccessToken;
 
     const defaultAddress = form.has('defaultAddress')
       ? String(form.get('defaultAddress')) === 'on'
-      : false;
-    const address: CustomerAddressInput = {};
-    const keys: (keyof CustomerAddressInput)[] = [
+      : null;
+    const address: MailingAddressInput = {};
+    const keys: (keyof MailingAddressInput)[] = [
       'address1',
       'address2',
       'city',
       'company',
-      'territoryCode',
+      'country',
       'firstName',
       'lastName',
-      'phoneNumber',
-      'zoneCode',
+      'phone',
+      'province',
       'zip',
     ];
 
@@ -93,162 +83,134 @@ export async function action({request, context}: ActionFunctionArgs) {
       case 'POST': {
         // handle new address creation
         try {
-          const {data, errors} = await customerAccount.mutate(
+          const {customerAddressCreate} = await storefront.mutate(
             CREATE_ADDRESS_MUTATION,
             {
-              variables: {address, defaultAddress},
+              variables: {customerAccessToken: accessToken, address},
             },
           );
 
-          if (errors?.length) {
-            throw new Error(errors[0].message);
+          if (customerAddressCreate?.customerUserErrors?.length) {
+            const error = customerAddressCreate.customerUserErrors[0];
+            throw new Error(error.message);
           }
 
-          if (data?.customerAddressCreate?.userErrors?.length) {
-            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
+          const createdAddress = customerAddressCreate?.customerAddress;
+          if (!createdAddress?.id) {
+            throw new Error(
+              'Expected customer address to be created, but the id is missing',
+            );
           }
 
-          if (!data?.customerAddressCreate?.customerAddress) {
-            throw new Error('Customer address create failed.');
-          }
-
-          return {
-            error: null,
-            createdAddress: data?.customerAddressCreate?.customerAddress,
-            defaultAddress,
-          };
-        } catch (error: unknown) {
-          if (error instanceof Error) {
-            return data(
-              {error: {[addressId]: error.message}},
+          if (defaultAddress) {
+            const createdAddressId = decodeURIComponent(createdAddress.id);
+            const {customerDefaultAddressUpdate} = await storefront.mutate(
+              UPDATE_DEFAULT_ADDRESS_MUTATION,
               {
-                status: 400,
+                variables: {
+                  customerAccessToken: accessToken,
+                  addressId: createdAddressId,
+                },
               },
             );
+
+            if (customerDefaultAddressUpdate?.customerUserErrors?.length) {
+              const error = customerDefaultAddressUpdate.customerUserErrors[0];
+              throw new Error(error.message);
+            }
           }
-          return data(
-            {error: {[addressId]: error}},
-            {
-              status: 400,
-            },
-          );
+
+          return {error: null, createdAddress, defaultAddress};
+        } catch (error: unknown) {
+          if (error instanceof Error) {
+            return data({error: {[addressId]: error.message}}, {status: 400});
+          }
+          return data({error: {[addressId]: error}}, {status: 400});
         }
       }
 
       case 'PUT': {
         // handle address updates
         try {
-          const {data, errors} = await customerAccount.mutate(
+          const {customerAddressUpdate} = await storefront.mutate(
             UPDATE_ADDRESS_MUTATION,
             {
               variables: {
                 address,
-                addressId: decodeURIComponent(addressId),
-                defaultAddress,
+                customerAccessToken: accessToken,
+                id: decodeURIComponent(addressId),
               },
             },
           );
 
-          if (errors?.length) {
-            throw new Error(errors[0].message);
-          }
-
-          if (data?.customerAddressUpdate?.userErrors?.length) {
-            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
-          }
+          const updatedAddress = customerAddressUpdate?.customerAddress;
 
-          if (!data?.customerAddressUpdate?.customerAddress) {
-            throw new Error('Customer address update failed.');
+          if (customerAddressUpdate?.customerUserErrors?.length) {
+            const error = customerAddressUpdate.customerUserErrors[0];
+            throw new Error(error.message);
           }
 
-          return {
-            error: null,
-            updatedAddress: address,
-            defaultAddress,
-          };
-        } catch (error: unknown) {
-          if (error instanceof Error) {
-            return data(
-              {error: {[addressId]: error.message}},
+          if (defaultAddress) {
+            const {customerDefaultAddressUpdate} = await storefront.mutate(
+              UPDATE_DEFAULT_ADDRESS_MUTATION,
               {
-                status: 400,
+                variables: {
+                  customerAccessToken: accessToken,
+                  addressId: decodeURIComponent(addressId),
+                },
               },
             );
+
+            if (customerDefaultAddressUpdate?.customerUserErrors?.length) {
+              const error = customerDefaultAddressUpdate.customerUserErrors[0];
+              throw new Error(error.message);
+            }
           }
-          return data(
-            {error: {[addressId]: error}},
-            {
-              status: 400,
-            },
-          );
+
+          return {error: null, updatedAddress, defaultAddress};
+        } catch (error: unknown) {
+          if (error instanceof Error) {
+            return data({error: {[addressId]: error.message}}, {status: 400});
+          }
+          return data({error: {[addressId]: error}}, {status: 400});
         }
       }
 
       case 'DELETE': {
         // handles address deletion
         try {
-          const {data, errors} = await customerAccount.mutate(
+          const {customerAddressDelete} = await storefront.mutate(
             DELETE_ADDRESS_MUTATION,
             {
-              variables: {addressId: decodeURIComponent(addressId)},
+              variables: {customerAccessToken: accessToken, id: addressId},
             },
           );
 
-          if (errors?.length) {
-            throw new Error(errors[0].message);
+          if (customerAddressDelete?.customerUserErrors?.length) {
+            const error = customerAddressDelete.customerUserErrors[0];
+            throw new Error(error.message);
           }
-
-          if (data?.customerAddressDelete?.userErrors?.length) {
-            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
-          }
-
-          if (!data?.customerAddressDelete?.deletedAddressId) {
-            throw new Error('Customer address delete failed.');
-          }
-
           return {error: null, deletedAddress: addressId};
         } catch (error: unknown) {
           if (error instanceof Error) {
-            return data(
-              {error: {[addressId]: error.message}},
-              {
-                status: 400,
-              },
-            );
+            return data({error: {[addressId]: error.message}}, {status: 400});
           }
-          return data(
-            {error: {[addressId]: error}},
-            {
-              status: 400,
-            },
-          );
+          return data({error: {[addressId]: error}}, {status: 400});
         }
       }
 
       default: {
         return data(
           {error: {[addressId]: 'Method not allowed'}},
-          {
-            status: 405,
-          },
+          {status: 405},
         );
       }
     }
   } catch (error: unknown) {
     if (error instanceof Error) {
-      return data(
-        {error: error.message},
-        {
-          status: 400,
-        },
-      );
+      return data({error: error.message}, {status: 400});
     }
-    return data(
-      {error},
-      {
-        status: 400,
-      },
-    );
+    return data({error}, {status: 400});
   }
 }
 
@@ -287,21 +249,17 @@ function NewAddressForm() {
     address2: '',
     city: '',
     company: '',
-    territoryCode: '',
+    country: '',
     firstName: '',
     id: 'new',
     lastName: '',
-    phoneNumber: '',
-    zoneCode: '',
+    phone: '',
+    province: '',
     zip: '',
-  } as CustomerAddressInput;
+  } as AddressFragment;
 
   return (
-    <AddressForm
-      addressId={'NEW_ADDRESS_ID'}
-      address={newAddress}
-      defaultAddress={null}
-    >
+    <AddressForm address={newAddress} defaultAddress={null}>
       {({stateForMethod}) => (
         <div>
           <button
@@ -327,7 +285,6 @@ function ExistingAddresses({
       {addresses.nodes.map((address) => (
         <AddressForm
           key={address.id}
-          addressId={address.id}
           address={address}
           defaultAddress={defaultAddress}
         >
@@ -356,26 +313,26 @@ function ExistingAddresses({
 }
 
 export function AddressForm({
-  addressId,
   address,
   defaultAddress,
   children,
 }: {
-  addressId: AddressFragment['id'];
-  address: CustomerAddressInput;
-  defaultAddress: CustomerFragment['defaultAddress'];
   children: (props: {
-    stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
+    stateForMethod: (
+      method: 'PUT' | 'POST' | 'DELETE',
+    ) => ReturnType<typeof useNavigation>['state'];
   }) => React.ReactNode;
+  defaultAddress: CustomerFragment['defaultAddress'];
+  address: AddressFragment;
 }) {
   const {state, formMethod} = useNavigation();
   const action = useActionData<ActionResponse>();
-  const error = action?.error?.[addressId];
-  const isDefaultAddress = defaultAddress?.id === addressId;
+  const error = action?.error?.[address.id];
+  const isDefaultAddress = defaultAddress?.id === address.id;
   return (
-    <Form id={addressId}>
+    <Form id={address.id}>
       <fieldset>
-        <input type="hidden" name="addressId" defaultValue={addressId} />
+        <input type="hidden" name="addressId" defaultValue={address.id} />
         <label htmlFor="firstName">First name*</label>
         <input
           aria-label="First name"
@@ -440,13 +397,13 @@ export function AddressForm({
           required
           type="text"
         />
-        <label htmlFor="zoneCode">State / Province*</label>
+        <label htmlFor="province">State / Province*</label>
         <input
-          aria-label="State/Province"
+          aria-label="State"
           autoComplete="address-level1"
-          defaultValue={address?.zoneCode ?? ''}
-          id="zoneCode"
-          name="zoneCode"
+          defaultValue={address?.province ?? ''}
+          id="province"
+          name="province"
           placeholder="State / Province"
           required
           type="text"
@@ -462,25 +419,24 @@ export function AddressForm({
           required
           type="text"
         />
-        <label htmlFor="territoryCode">Country Code*</label>
+        <label htmlFor="country">Country*</label>
         <input
-          aria-label="territoryCode"
-          autoComplete="country"
-          defaultValue={address?.territoryCode ?? ''}
-          id="territoryCode"
-          name="territoryCode"
+          aria-label="Country"
+          autoComplete="country-name"
+          defaultValue={address?.country ?? ''}
+          id="country"
+          name="country"
           placeholder="Country"
           required
           type="text"
-          maxLength={2}
         />
-        <label htmlFor="phoneNumber">Phone</label>
+        <label htmlFor="phone">Phone</label>
         <input
-          aria-label="Phone Number"
+          aria-label="Phone"
           autoComplete="tel"
-          defaultValue={address?.phoneNumber ?? ''}
-          id="phoneNumber"
-          name="phoneNumber"
+          defaultValue={address?.phone ?? ''}
+          id="phone"
+          name="phone"
           placeholder="+16135551111"
           pattern="^\+?[1-9]\d{3,14}$"
           type="tel"
@@ -510,3 +466,98 @@ export function AddressForm({
     </Form>
   );
 }
+
+// NOTE: https://shopify.dev/docs/api/storefront/2023-04/mutations/customeraddressupdate
+const UPDATE_ADDRESS_MUTATION = `#graphql
+  mutation customerAddressUpdate(
+    $address: MailingAddressInput!
+    $customerAccessToken: String!
+    $id: ID!
+    $country: CountryCode
+    $language: LanguageCode
+ ) @inContext(country: $country, language: $language) {
+    customerAddressUpdate(
+      address: $address
+      customerAccessToken: $customerAccessToken
+      id: $id
+    ) {
+      customerAddress {
+        id
+      }
+      customerUserErrors {
+        code
+        field
+        message
+      }
+    }
+  }
+` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerAddressDelete
+const DELETE_ADDRESS_MUTATION = `#graphql
+  mutation customerAddressDelete(
+    $customerAccessToken: String!,
+    $id: ID!,
+    $country: CountryCode,
+    $language: LanguageCode
+  ) @inContext(country: $country, language: $language) {
+    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
+      customerUserErrors {
+        code
+        field
+        message
+      }
+      deletedCustomerAddressId
+    }
+  }
+` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerdefaultaddressupdate
+const UPDATE_DEFAULT_ADDRESS_MUTATION = `#graphql
+  mutation customerDefaultAddressUpdate(
+    $addressId: ID!
+    $customerAccessToken: String!
+    $country: CountryCode
+    $language: LanguageCode
+  ) @inContext(country: $country, language: $language) {
+    customerDefaultAddressUpdate(
+      addressId: $addressId
+      customerAccessToken: $customerAccessToken
+    ) {
+      customer {
+        defaultAddress {
+          id
+        }
+      }
+      customerUserErrors {
+        code
+        field
+        message
+      }
+    }
+  }
+` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customeraddresscreate
+const CREATE_ADDRESS_MUTATION = `#graphql
+  mutation customerAddressCreate(
+    $address: MailingAddressInput!
+    $customerAccessToken: String!
+    $country: CountryCode
+    $language: LanguageCode
+  ) @inContext(country: $country, language: $language) {
+    customerAddressCreate(
+      address: $address
+      customerAccessToken: $customerAccessToken
+    ) {
+      customerAddress {
+        id
+      }
+      customerUserErrors {
+        code
+        field
+        message
+      }
+    }
+  }
+` as const;

```

</details>

### 7. app/routes/account.orders.$id.tsx



#### File: [`app/routes/account.orders.$id.tsx`](/templates/skeleton/app/routes/account.orders.$id.tsx)

<details>

```diff
index f5b3e0e4..932ee97a 100644
--- a/templates/skeleton/app/routes/account.orders.$id.tsx
+++ b/templates/skeleton/app/routes/account.orders.$id.tsx
@@ -1,38 +1,37 @@
 import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {useLoaderData, type MetaFunction} from '@remix-run/react';
+import {Link, useLoaderData, type MetaFunction} from '@remix-run/react';
 import {Money, Image, flattenConnection} from '@shopify/hydrogen';
-import type {OrderLineItemFullFragment} from 'customer-accountapi.generated';
-import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
+import type {OrderLineItemFullFragment} from 'storefrontapi.generated';
 
 export const meta: MetaFunction<typeof loader> = ({data}) => {
   return [{title: `Order ${data?.order?.name}`}];
 };
 
 export async function loader({params, context}: LoaderFunctionArgs) {
+  const {session, storefront} = context;
+
   if (!params.id) {
     return redirect('/account/orders');
   }
 
   const orderId = atob(params.id);
-  const {data, errors} = await context.customerAccount.query(
-    CUSTOMER_ORDER_QUERY,
-    {
-      variables: {orderId},
-    },
-  );
+  const customerAccessToken = await session.get('customerAccessToken');
 
-  if (errors?.length || !data?.order) {
-    throw new Error('Order not found');
+  if (!customerAccessToken) {
+    return redirect('/account/login');
   }
 
-  const {order} = data;
+  const {order} = await storefront.query(CUSTOMER_ORDER_QUERY, {
+    variables: {orderId},
+  });
+
+  if (!order || !('lineItems' in order)) {
+    throw new Response('Order not found', {status: 404});
+  }
 
   const lineItems = flattenConnection(order.lineItems);
   const discountApplications = flattenConnection(order.discountApplications);
 
-  const fulfillmentStatus =
-    flattenConnection(order.fulfillments)[0]?.status ?? 'N/A';
-
   const firstDiscount = discountApplications[0]?.value;
 
   const discountValue =
@@ -47,18 +46,12 @@ export async function loader({params, context}: LoaderFunctionArgs) {
     lineItems,
     discountValue,
     discountPercentage,
-    fulfillmentStatus,
   };
 }
 
 export default function OrderRoute() {
-  const {
-    order,
-    lineItems,
-    discountValue,
-    discountPercentage,
-    fulfillmentStatus,
-  } = useLoaderData<typeof loader>();
+  const {order, lineItems, discountValue, discountPercentage} =
+    useLoaderData<typeof loader>();
   return (
     <div className="account-order">
       <h2>Order {order.name}</h2>
@@ -107,7 +100,7 @@ export default function OrderRoute() {
                 <p>Subtotal</p>
               </th>
               <td>
-                <Money data={order.subtotal!} />
+                <Money data={order.subtotalPriceV2!} />
               </td>
             </tr>
             <tr>
@@ -118,7 +111,7 @@ export default function OrderRoute() {
                 <p>Tax</p>
               </th>
               <td>
-                <Money data={order.totalTax!} />
+                <Money data={order.totalTaxV2!} />
               </td>
             </tr>
             <tr>
@@ -129,7 +122,7 @@ export default function OrderRoute() {
                 <p>Total</p>
               </th>
               <td>
-                <Money data={order.totalPrice!} />
+                <Money data={order.totalPriceV2!} />
               </td>
             </tr>
           </tfoot>
@@ -138,16 +131,17 @@ export default function OrderRoute() {
           <h3>Shipping Address</h3>
           {order?.shippingAddress ? (
             <address>
-              <p>{order.shippingAddress.name}</p>
-              {order.shippingAddress.formatted ? (
-                <p>{order.shippingAddress.formatted}</p>
+              <p>
+                {order.shippingAddress.firstName &&
+                  order.shippingAddress.firstName + ' '}
+                {order.shippingAddress.lastName}
+              </p>
+              {order?.shippingAddress?.formatted ? (
+                order.shippingAddress.formatted.map((line: string) => (
+                  <p key={line}>{line}</p>
+                ))
               ) : (
-                ''
-              )}
-              {order.shippingAddress.formattedArea ? (
-                <p>{order.shippingAddress.formattedArea}</p>
-              ) : (
-                ''
+                <></>
               )}
             </address>
           ) : (
@@ -155,13 +149,13 @@ export default function OrderRoute() {
           )}
           <h3>Status</h3>
           <div>
-            <p>{fulfillmentStatus}</p>
+            <p>{order.fulfillmentStatus}</p>
           </div>
         </div>
       </div>
       <br />
       <p>
-        <a target="_blank" href={order.statusPageUrl} rel="noreferrer">
+        <a target="_blank" href={order.statusUrl} rel="noreferrer">
           View Order Status →
         </a>
       </p>
@@ -171,27 +165,145 @@ export default function OrderRoute() {
 
 function OrderLineRow({lineItem}: {lineItem: OrderLineItemFullFragment}) {
   return (
-    <tr key={lineItem.id}>
+    <tr key={lineItem.variant!.id}>
       <td>
         <div>
-          {lineItem?.image && (
-            <div>
-              <Image data={lineItem.image} width={96} height={96} />
-            </div>
-          )}
+          <Link to={`/products/${lineItem.variant!.product!.handle}`}>
+            {lineItem?.variant?.image && (
+              <div>
+                <Image data={lineItem.variant.image} width={96} height={96} />
+              </div>
+            )}
+          </Link>
           <div>
             <p>{lineItem.title}</p>
-            <small>{lineItem.variantTitle}</small>
+            <small>{lineItem.variant!.title}</small>
           </div>
         </div>
       </td>
       <td>
-        <Money data={lineItem.price!} />
+        <Money data={lineItem.variant!.price!} />
       </td>
       <td>{lineItem.quantity}</td>
       <td>
-        <Money data={lineItem.totalDiscount!} />
+        <Money data={lineItem.discountedTotalPrice!} />
       </td>
     </tr>
   );
 }
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Order
+const CUSTOMER_ORDER_QUERY = `#graphql
+  fragment OrderMoney on MoneyV2 {
+    amount
+    currencyCode
+  }
+  fragment AddressFull on MailingAddress {
+    address1
+    address2
+    city
+    company
+    country
+    countryCodeV2
+    firstName
+    formatted
+    id
+    lastName
+    name
+    phone
+    province
+    provinceCode
+    zip
+  }
+  fragment DiscountApplication on DiscountApplication {
+    value {
+      __typename
+      ... on MoneyV2 {
+        ...OrderMoney
+      }
+      ... on PricingPercentageValue {
+        percentage
+      }
+    }
+  }
+  fragment OrderLineProductVariant on ProductVariant {
+    id
+    image {
+      altText
+      height
+      url
+      id
+      width
+    }
+    price {
+      ...OrderMoney
+    }
+    product {
+      handle
+    }
+    sku
+    title
+  }
+  fragment OrderLineItemFull on OrderLineItem {
+    title
+    quantity
+    discountAllocations {
+      allocatedAmount {
+        ...OrderMoney
+      }
+      discountApplication {
+        ...DiscountApplication
+      }
+    }
+    originalTotalPrice {
+      ...OrderMoney
+    }
+    discountedTotalPrice {
+      ...OrderMoney
+    }
+    variant {
+      ...OrderLineProductVariant
+    }
+  }
+  fragment Order on Order {
+    id
+    name
+    orderNumber
+    statusUrl
+    processedAt
+    fulfillmentStatus
+    totalTaxV2 {
+      ...OrderMoney
+    }
+    totalPriceV2 {
+      ...OrderMoney
+    }
+    subtotalPriceV2 {
+      ...OrderMoney
+    }
+    shippingAddress {
+      ...AddressFull
+    }
+    discountApplications(first: 100) {
+      nodes {
+        ...DiscountApplication
+      }
+    }
+    lineItems(first: 100) {
+      nodes {
+        ...OrderLineItemFull
+      }
+    }
+  }
+  query Order(
+    $country: CountryCode
+    $language: LanguageCode
+    $orderId: ID!
+  ) @inContext(country: $country, language: $language) {
+    order: node(id: $orderId) {
+      ... on Order {
+        ...Order
+      }
+    }
+  }
+` as const;

```

</details>

### 8. app/routes/account.orders._index.tsx



#### File: [`app/routes/account.orders._index.tsx`](/templates/skeleton/app/routes/account.orders._index.tsx)

<details>

```diff
index ba41d03a..d5bda5f2 100644
--- a/templates/skeleton/app/routes/account.orders._index.tsx
+++ b/templates/skeleton/app/routes/account.orders._index.tsx
@@ -1,47 +1,60 @@
 import {Link, useLoaderData, type MetaFunction} from '@remix-run/react';
-import {
-  Money,
-  getPaginationVariables,
-  flattenConnection,
-} from '@shopify/hydrogen';
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
+import {Money, Pagination, getPaginationVariables} from '@shopify/hydrogen';
+import {data, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import type {
   CustomerOrdersFragment,
   OrderItemFragment,
-} from 'customer-accountapi.generated';
-import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
+} from 'storefrontapi.generated';
 
 export const meta: MetaFunction = () => {
   return [{title: 'Orders'}];
 };
 
 export async function loader({request, context}: LoaderFunctionArgs) {
-  const paginationVariables = getPaginationVariables(request, {
-    pageBy: 20,
-  });
+  const {session, storefront} = context;
 
-  const {data, errors} = await context.customerAccount.query(
-    CUSTOMER_ORDERS_QUERY,
-    {
+  const customerAccessToken = await session.get('customerAccessToken');
+  if (!customerAccessToken?.accessToken) {
+    return redirect('/account/login');
+  }
+
+  try {
+    const paginationVariables = getPaginationVariables(request, {
+      pageBy: 20,
+    });
+
+    const {customer} = await storefront.query(CUSTOMER_ORDERS_QUERY, {
       variables: {
+        customerAccessToken: customerAccessToken.accessToken,
+        country: storefront.i18n.country,
+        language: storefront.i18n.language,
         ...paginationVariables,
       },
-    },
-  );
+      cache: storefront.CacheNone(),
+    });
 
-  if (errors?.length || !data?.customer) {
-    throw Error('Customer orders not found');
+    if (!customer) {
+      throw new Error('Customer not found');
+    }
+
+    return {customer};
+  } catch (error: unknown) {
+    if (error instanceof Error) {
+      return data({error: error.message}, {status: 400});
+    }
+    return data({error}, {status: 400});
   }
-
-  return {customer: data.customer};
 }
 
 export default function Orders() {
   const {customer} = useLoaderData<{customer: CustomerOrdersFragment}>();
-  const {orders} = customer;
+  const {orders, numberOfOrders} = customer;
   return (
     <div className="orders">
+      <h2>
+        Orders <small>({numberOfOrders})</small>
+      </h2>
+      <br />
       {orders.nodes.length ? <OrdersTable orders={orders} /> : <EmptyOrders />}
     </div>
   );
@@ -51,9 +64,23 @@ function OrdersTable({orders}: Pick<CustomerOrdersFragment, 'orders'>) {
   return (
     <div className="acccount-orders">
       {orders?.nodes.length ? (
-        <PaginatedResourceSection connection={orders}>
-          {({node: order}) => <OrderItem key={order.id} order={order} />}
-        </PaginatedResourceSection>
+        <Pagination connection={orders}>
+          {({nodes, isLoading, PreviousLink, NextLink}) => {
+            return (
+              <>
+                <PreviousLink>
+                  {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
+                </PreviousLink>
+                {nodes.map((order) => {
+                  return <OrderItem key={order.id} order={order} />;
+                })}
+                <NextLink>
+                  {isLoading ? 'Loading...' : <span>Load more ↓</span>}
+                </NextLink>
+              </>
+            );
+          }}
+        </Pagination>
       ) : (
         <EmptyOrders />
       )}
@@ -74,20 +101,91 @@ function EmptyOrders() {
 }
 
 function OrderItem({order}: {order: OrderItemFragment}) {
-  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
   return (
     <>
       <fieldset>
-        <Link to={`/account/orders/${btoa(order.id)}`}>
-          <strong>#{order.number}</strong>
+        <Link to={`/account/orders/${order.id}`}>
+          <strong>#{order.orderNumber}</strong>
         </Link>
         <p>{new Date(order.processedAt).toDateString()}</p>
         <p>{order.financialStatus}</p>
-        {fulfillmentStatus && <p>{fulfillmentStatus}</p>}
-        <Money data={order.totalPrice} />
+        <p>{order.fulfillmentStatus}</p>
+        <Money data={order.currentTotalPrice} />
         <Link to={`/account/orders/${btoa(order.id)}`}>View Order →</Link>
       </fieldset>
       <br />
     </>
   );
 }
+
+const ORDER_ITEM_FRAGMENT = `#graphql
+  fragment OrderItem on Order {
+    currentTotalPrice {
+      amount
+      currencyCode
+    }
+    financialStatus
+    fulfillmentStatus
+    id
+    lineItems(first: 10) {
+      nodes {
+        title
+        variant {
+          image {
+            url
+            altText
+            height
+            width
+          }
+        }
+      }
+    }
+    orderNumber
+    customerUrl
+    statusUrl
+    processedAt
+  }
+` as const;
+
+export const CUSTOMER_FRAGMENT = `#graphql
+  fragment CustomerOrders on Customer {
+    numberOfOrders
+    orders(
+      sortKey: PROCESSED_AT,
+      reverse: true,
+      first: $first,
+      last: $last,
+      before: $startCursor,
+      after: $endCursor
+    ) {
+      nodes {
+        ...OrderItem
+      }
+      pageInfo {
+        hasPreviousPage
+        hasNextPage
+        endCursor
+        startCursor
+      }
+    }
+  }
+  ${ORDER_ITEM_FRAGMENT}
+` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/customer
+const CUSTOMER_ORDERS_QUERY = `#graphql
+  ${CUSTOMER_FRAGMENT}
+  query CustomerOrders(
+    $country: CountryCode
+    $customerAccessToken: String!
+    $endCursor: String
+    $first: Int
+    $language: LanguageCode
+    $last: Int
+    $startCursor: String
+  ) @inContext(country: $country, language: $language) {
+    customer(customerAccessToken: $customerAccessToken) {
+      ...CustomerOrders
+    }
+  }
+` as const;

```

</details>

### 9. app/routes/account.profile.tsx



#### File: [`app/routes/account.profile.tsx`](/templates/skeleton/app/routes/account.profile.tsx)

<details>

```diff
index 2973758c..b1a834b3 100644
--- a/templates/skeleton/app/routes/account.profile.tsx
+++ b/templates/skeleton/app/routes/account.profile.tsx
@@ -1,8 +1,8 @@
-import type {CustomerFragment} from 'customer-accountapi.generated';
-import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
-import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
+import type {CustomerFragment} from 'storefrontapi.generated';
+import type {CustomerUpdateInput} from '@shopify/hydrogen/storefront-api-types';
 import {
   data,
+  redirect,
   type ActionFunctionArgs,
   type LoaderFunctionArgs,
 } from '@shopify/remix-oxygen';
@@ -24,61 +24,79 @@ export const meta: MetaFunction = () => {
 };
 
 export async function loader({context}: LoaderFunctionArgs) {
-  await context.customerAccount.handleAuthStatus();
-
+  const customerAccessToken = await context.session.get('customerAccessToken');
+  if (!customerAccessToken) {
+    return redirect('/account/login');
+  }
   return {};
 }
 
 export async function action({request, context}: ActionFunctionArgs) {
-  const {customerAccount} = context;
+  const {session, storefront} = context;
 
   if (request.method !== 'PUT') {
     return data({error: 'Method not allowed'}, {status: 405});
   }
 
   const form = await request.formData();
+  const customerAccessToken = await session.get('customerAccessToken');
+  if (!customerAccessToken) {
+    return data({error: 'Unauthorized'}, {status: 401});
+  }
 
   try {
+    const password = getPassword(form);
     const customer: CustomerUpdateInput = {};
-    const validInputKeys = ['firstName', 'lastName'] as const;
+    const validInputKeys = [
+      'firstName',
+      'lastName',
+      'email',
+      'password',
+      'phone',
+    ] as const;
     for (const [key, value] of form.entries()) {
       if (!validInputKeys.includes(key as any)) {
         continue;
       }
+      if (key === 'acceptsMarketing') {
+        customer.acceptsMarketing = value === 'on';
+      }
       if (typeof value === 'string' && value.length) {
         customer[key as (typeof validInputKeys)[number]] = value;
       }
     }
 
+    if (password) {
+      customer.password = password;
+    }
+
     // update customer and possibly password
-    const {data, errors} = await customerAccount.mutate(
-      CUSTOMER_UPDATE_MUTATION,
-      {
-        variables: {
-          customer,
-        },
+    const updated = await storefront.mutate(CUSTOMER_UPDATE_MUTATION, {
+      variables: {
+        customerAccessToken: customerAccessToken.accessToken,
+        customer,
       },
-    );
+    });
 
-    if (errors?.length) {
-      throw new Error(errors[0].message);
+    // check for mutation errors
+    if (updated.customerUpdate?.customerUserErrors?.length) {
+      return data(
+        {error: updated.customerUpdate?.customerUserErrors[0]},
+        {status: 400},
+      );
     }
 
-    if (!data?.customerUpdate?.customer) {
-      throw new Error('Customer profile update failed.');
+    // update session with the updated access token
+    if (updated.customerUpdate?.customerAccessToken?.accessToken) {
+      session.set(
+        'customerAccessToken',
+        updated.customerUpdate?.customerAccessToken,
+      );
     }
 
-    return {
-      error: null,
-      customer: data?.customerUpdate?.customer,
-    };
+    return {error: null, customer: updated.customerUpdate?.customer};
   } catch (error: any) {
-    return data(
-      {error: error.message, customer: null},
-      {
-        status: 400,
-      },
-    );
+    return data({error: error.message, customer: null}, {status: 400});
   }
 }
 
@@ -117,6 +135,64 @@ export default function AccountProfile() {
             defaultValue={customer.lastName ?? ''}
             minLength={2}
           />
+          <label htmlFor="phone">Mobile</label>
+          <input
+            id="phone"
+            name="phone"
+            type="tel"
+            autoComplete="tel"
+            placeholder="Mobile"
+            aria-label="Mobile"
+            defaultValue={customer.phone ?? ''}
+          />
+          <label htmlFor="email">Email address</label>
+          <input
+            id="email"
+            name="email"
+            type="email"
+            autoComplete="email"
+            required
+            placeholder="Email address"
+            aria-label="Email address"
+            defaultValue={customer.email ?? ''}
+          />
+          <div className="account-profile-marketing">
+            <input
+              id="acceptsMarketing"
+              name="acceptsMarketing"
+              type="checkbox"
+              placeholder="Accept marketing"
+              aria-label="Accept marketing"
+              defaultChecked={customer.acceptsMarketing}
+            />
+            <label htmlFor="acceptsMarketing">
+              &nbsp; Subscribed to marketing communications
+            </label>
+          </div>
+        </fieldset>
+        <br />
+        <legend>Change password (optional)</legend>
+        <fieldset>
+          <label htmlFor="newPassword">New password</label>
+          <input
+            id="newPassword"
+            name="newPassword"
+            type="password"
+            placeholder="New password"
+            aria-label="New password"
+            minLength={8}
+          />
+
+          <label htmlFor="newPasswordConfirm">New password (confirm)</label>
+          <input
+            id="newPasswordConfirm"
+            name="newPasswordConfirm"
+            type="password"
+            placeholder="New password (confirm)"
+            aria-label="New password confirm"
+            minLength={8}
+          />
+          <small>Passwords must be at least 8 characters.</small>
         </fieldset>
         {action?.error ? (
           <p>
@@ -134,3 +210,55 @@ export default function AccountProfile() {
     </div>
   );
 }
+
+function getPassword(form: FormData): string | undefined {
+  let password;
+  const newPassword = form.get('newPassword');
+  const newPasswordConfirm = form.get('newPasswordConfirm');
+
+  let passwordError;
+
+  if (newPassword && newPassword !== newPasswordConfirm) {
+    passwordError = new Error('New passwords must match.');
+  }
+
+  if (passwordError) {
+    throw passwordError;
+  }
+
+  if (newPassword) {
+    password = newPassword;
+  }
+
+  return String(password);
+}
+
+const CUSTOMER_UPDATE_MUTATION = `#graphql
+  # https://shopify.dev/docs/api/storefront/latest/mutations/customerUpdate
+  mutation customerUpdate(
+    $customerAccessToken: String!,
+    $customer: CustomerUpdateInput!
+    $country: CountryCode
+    $language: LanguageCode
+  ) @inContext(language: $language, country: $country) {
+    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
+      customer {
+        acceptsMarketing
+        email
+        firstName
+        id
+        lastName
+        phone
+      }
+      customerAccessToken {
+        accessToken
+        expiresAt
+      }
+      customerUserErrors {
+        code
+        field
+        message
+      }
+    }
+  }
+` as const;

```

</details>

### 10. app/routes/account.tsx



#### File: [`app/routes/account.tsx`](/templates/skeleton/app/routes/account.tsx)

<details>

```diff
index 0941d4e0..629f246d 100644
--- a/templates/skeleton/app/routes/account.tsx
+++ b/templates/skeleton/app/routes/account.tsx
@@ -1,33 +1,98 @@
-import {data as remixData, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {Form, NavLink, Outlet, useLoaderData} from '@remix-run/react';
-import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
+import {data, type HeadersFunction, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import type {CustomerFragment} from 'storefrontapi.generated';
 
 export function shouldRevalidate() {
   return true;
 }
 
-export async function loader({context}: LoaderFunctionArgs) {
-  const {data, errors} = await context.customerAccount.query(
-    CUSTOMER_DETAILS_QUERY,
-  );
+export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;
+
+export async function loader({request, context}: LoaderFunctionArgs) {
+  const {session, storefront} = context;
+  const {pathname} = new URL(request.url);
+  const customerAccessToken = await session.get('customerAccessToken');
+  const isLoggedIn = !!customerAccessToken?.accessToken;
+  const isAccountHome = pathname === '/account' || pathname === '/account/';
+  const isPrivateRoute =
+    /^\/account\/(orders|orders\/.*|profile|addresses|addresses\/.*)$/.test(
+      pathname,
+    );
 
-  if (errors?.length || !data?.customer) {
-    throw new Error('Customer not found');
+  if (!isLoggedIn) {
+    if (isPrivateRoute || isAccountHome) {
+      session.unset('customerAccessToken');
+      return redirect('/account/login');
+    } else {
+      // public subroute such as /account/login...
+      return {
+        isLoggedIn: false,
+        isAccountHome,
+        isPrivateRoute,
+        customer: null,
+      };
+    }
+  } else {
+    // loggedIn, default redirect to the orders page
+    if (isAccountHome) {
+      return redirect('/account/orders');
+    }
   }
 
-  return remixData(
-    {customer: data.customer},
-    {
-      headers: {
-        'Cache-Control': 'no-cache, no-store, must-revalidate',
+  try {
+    const {customer} = await storefront.query(CUSTOMER_QUERY, {
+      variables: {
+        customerAccessToken: customerAccessToken.accessToken,
+        country: storefront.i18n.country,
+        language: storefront.i18n.language,
       },
-    },
-  );
+      cache: storefront.CacheNone(),
+    });
+
+    if (!customer) {
+      throw new Error('Customer not found');
+    }
+
+    return data(
+      {isLoggedIn, isPrivateRoute, isAccountHome, customer},
+      {
+        headers: {
+          'Cache-Control': 'no-cache, no-store, must-revalidate',
+        },
+      },
+    );
+  } catch (error) {
+    // eslint-disable-next-line no-console
+    console.error('There was a problem loading account', error);
+    session.unset('customerAccessToken');
+    return redirect('/account/login');
+  }
 }
 
-export default function AccountLayout() {
-  const {customer} = useLoaderData<typeof loader>();
+export default function Acccount() {
+  const {customer, isPrivateRoute, isAccountHome} =
+    useLoaderData<typeof loader>();
+
+  if (!isPrivateRoute && !isAccountHome) {
+    return <Outlet context={{customer}} />;
+  }
+
+  return (
+    <AccountLayout customer={customer as CustomerFragment}>
+      <br />
+      <br />
+      <Outlet context={{customer}} />
+    </AccountLayout>
+  );
+}
 
+function AccountLayout({
+  customer,
+  children,
+}: {
+  customer: CustomerFragment;
+  children: React.ReactNode;
+}) {
   const heading = customer
     ? customer.firstName
       ? `Welcome, ${customer.firstName}`
@@ -39,9 +104,7 @@ export default function AccountLayout() {
       <h1>{heading}</h1>
       <br />
       <AccountMenu />
-      <br />
-      <br />
-      <Outlet context={{customer}} />
+      {children}
     </div>
   );
 }
@@ -86,3 +149,50 @@ function Logout() {
     </Form>
   );
 }
+
+export const CUSTOMER_FRAGMENT = `#graphql
+  fragment Customer on Customer {
+    acceptsMarketing
+    addresses(first: 6) {
+      nodes {
+        ...Address
+      }
+    }
+    defaultAddress {
+      ...Address
+    }
+    email
+    firstName
+    lastName
+    numberOfOrders
+    phone
+  }
+  fragment Address on MailingAddress {
+    id
+    formatted
+    firstName
+    lastName
+    company
+    address1
+    address2
+    country
+    province
+    city
+    zip
+    phone
+  }
+` as const;
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/customer
+const CUSTOMER_QUERY = `#graphql
+  query Customer(
+    $customerAccessToken: String!
+    $country: CountryCode
+    $language: LanguageCode
+  ) @inContext(country: $country, language: $language) {
+    customer(customerAccessToken: $customerAccessToken) {
+      ...Customer
+    }
+  }
+  ${CUSTOMER_FRAGMENT}
+` as const;

```

</details>

### 11. app/routes/account_.login.tsx

A route that displays a login form.

#### File: [`app/routes/account_.login.tsx`](/templates/skeleton/app/routes/account_.login.tsx)

<details>

```diff
index f1e3db2f..fc356418 100644
--- a/templates/skeleton/app/routes/account_.login.tsx
+++ b/templates/skeleton/app/routes/account_.login.tsx
@@ -1,5 +1,138 @@
-import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import {
+  data,
+  redirect,
+  type ActionFunctionArgs,
+  type LoaderFunctionArgs,
+} from '@shopify/remix-oxygen';
+import {Form, Link, useActionData, type MetaFunction} from '@remix-run/react';
 
-export async function loader({request, context}: LoaderFunctionArgs) {
-  return context.customerAccount.login();
+type ActionResponse = {
+  error: string | null;
+};
+
+export const meta: MetaFunction = () => {
+  return [{title: 'Login'}];
+};
+
+export async function loader({context}: LoaderFunctionArgs) {
+  if (await context.session.get('customerAccessToken')) {
+    return redirect('/account');
+  }
+  return {};
 }
+
+export async function action({request, context}: ActionFunctionArgs) {
+  const {session, storefront} = context;
+
+  if (request.method !== 'POST') {
+    return data({error: 'Method not allowed'}, {status: 405});
+  }
+
+  try {
+    const form = await request.formData();
+    const email = String(form.has('email') ? form.get('email') : '');
+    const password = String(form.has('password') ? form.get('password') : '');
+    const validInputs = Boolean(email && password);
+
+    if (!validInputs) {
+      throw new Error('Please provide both an email and a password.');
+    }
+
+    const {customerAccessTokenCreate} = await storefront.mutate(
+      LOGIN_MUTATION,
+      {
+        variables: {
+          input: {email, password},
+        },
+      },
+    );
+
+    if (!customerAccessTokenCreate?.customerAccessToken?.accessToken) {
+      throw new Error(customerAccessTokenCreate?.customerUserErrors[0].message);
+    }
+
+    const {customerAccessToken} = customerAccessTokenCreate;
+    session.set('customerAccessToken', customerAccessToken);
+
+    return redirect('/account');
+  } catch (error: unknown) {
+    if (error instanceof Error) {
+      return data({error: error.message}, {status: 400});
+    }
+    return data({error}, {status: 400});
+  }
+}
+
+export default function Login() {
+  const data = useActionData<ActionResponse>();
+  const error = data?.error || null;
+
+  return (
+    <div className="login">
+      <h1>Sign in.</h1>
+      <Form method="POST">
+        <fieldset>
+          <label htmlFor="email">Email address</label>
+          <input
+            id="email"
+            name="email"
+            type="email"
+            autoComplete="email"
+            required
+            placeholder="Email address"
+            aria-label="Email address"
+            // eslint-disable-next-line jsx-a11y/no-autofocus
+            autoFocus
+          />
+          <label htmlFor="password">Password</label>
+          <input
+            id="password"
+            name="password"
+            type="password"
+            autoComplete="current-password"
+            placeholder="Password"
+            aria-label="Password"
+            minLength={8}
+            required
+          />
+        </fieldset>
+        {error ? (
+          <p>
+            <mark>
+              <small>{error}</small>
+            </mark>
+          </p>
+        ) : (
+          <br />
+        )}
+        <button type="submit">Sign in</button>
+      </Form>
+      <br />
+      <div>
+        <p>
+          <Link to="/account/recover">Forgot password →</Link>
+        </p>
+        <p>
+          <Link to="/account/register">Register →</Link>
+        </p>
+      </div>
+    </div>
+  );
+}
+
+// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customeraccesstokencreate
+const LOGIN_MUTATION = `#graphql
+  mutation login($input: CustomerAccessTokenCreateInput!) {
+    customerAccessTokenCreate(input: $input) {
+      customerUserErrors {
+        code
+        field
+        message
+      }
+      customerAccessToken {
+        accessToken
+        expiresAt
+      }
+    }
+  }
+` as const;

```

</details>

### 12. app/routes/account_.logout.tsx



#### File: [`app/routes/account_.logout.tsx`](/templates/skeleton/app/routes/account_.logout.tsx)

```diff
index 36e05e15..31a41bc5 100644
--- a/templates/skeleton/app/routes/account_.logout.tsx
+++ b/templates/skeleton/app/routes/account_.logout.tsx
@@ -1,10 +1,25 @@
-import {redirect, type ActionFunctionArgs} from '@shopify/remix-oxygen';
+import {data, redirect, type ActionFunctionArgs} from '@shopify/remix-oxygen';
+import {type MetaFunction} from '@remix-run/react';
+
+export const meta: MetaFunction = () => {
+  return [{title: 'Logout'}];
+};
 
-// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
 export async function loader() {
+  return redirect('/account/login');
+}
+
+export async function action({request, context}: ActionFunctionArgs) {
+  const {session} = context;
+  session.unset('customerAccessToken');
+
+  if (request.method !== 'POST') {
+    return data({error: 'Method not allowed'}, {status: 405});
+  }
+
   return redirect('/');
 }
 
-export async function action({context}: ActionFunctionArgs) {
-  return context.customerAccount.logout();
+export default function Logout() {
+  return null;
 }

```

### 13. app/routes/cart.tsx



#### File: [`app/routes/cart.tsx`](/templates/skeleton/app/routes/cart.tsx)

<details>

```diff
index 62dc7602..310e8b38 100644
--- a/templates/skeleton/app/routes/cart.tsx
+++ b/templates/skeleton/app/routes/cart.tsx
@@ -1,8 +1,13 @@
 import {type MetaFunction, useLoaderData} from '@remix-run/react';
 import type {CartQueryDataReturn} from '@shopify/hydrogen';
 import {CartForm} from '@shopify/hydrogen';
-import {data, type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersFunction} from '@shopify/remix-oxygen';
-import {CartMain} from '~/components/CartMain';
+import {
+  data,
+  type LoaderFunctionArgs,
+  type ActionFunctionArgs,
+  type HeadersFunction,
+} from '@shopify/remix-oxygen';
+import {CartMain} from '~/components/Cart';
 
 export const meta: MetaFunction = () => {
   return [{title: `Hydrogen | Cart`}];
@@ -11,9 +16,12 @@ export const meta: MetaFunction = () => {
 export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
 
 export async function action({request, context}: ActionFunctionArgs) {
-  const {cart} = context;
+  const {session, cart} = context;
 
-  const formData = await request.formData();
+  const [formData, customerAccessToken] = await Promise.all([
+    request.formData(),
+    session.get('customerAccessToken'),
+  ]);
 
   const {action, inputs} = CartForm.getFormInput(formData);
 
@@ -65,6 +73,7 @@ export async function action({request, context}: ActionFunctionArgs) {
     case CartForm.ACTIONS.BuyerIdentityUpdate: {
       result = await cart.updateBuyerIdentity({
         ...inputs.buyerIdentity,
+        customerAccessToken: customerAccessToken?.accessToken,
       });
       break;
     }
@@ -74,7 +83,7 @@ export async function action({request, context}: ActionFunctionArgs) {
 
   const cartId = result?.cart?.id;
   const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
-  const {cart: cartResult, errors, warnings} = result;
+  const {cart: cartResult, errors} = result;
 
   const redirectTo = formData.get('redirectTo') ?? null;
   if (typeof redirectTo === 'string') {
@@ -86,7 +95,6 @@ export async function action({request, context}: ActionFunctionArgs) {
     {
       cart: cartResult,
       errors,
-      warnings,
       analytics: {
         cartId,
       },

```

</details>

### 14. env.d.ts



#### File: [`env.d.ts`](/templates/skeleton/env.d.ts)

```diff
index c9538bf4..ce0a465c 100644
--- a/templates/skeleton/env.d.ts
+++ b/templates/skeleton/env.d.ts
@@ -19,7 +19,9 @@ declare global {
   const process: {env: {NODE_ENV: 'production' | 'development'}};
 
   interface Env extends HydrogenEnv {
-    // declare additional Env parameter use in the fetch handler and Remix loader context here
+    // declare additional Env parameter in the fetch handler and in Remix loader context here
+    PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET: string;
+    SHOPIFY_CHECKOUT_DOMAIN: string;
   }
 }
 
@@ -29,7 +31,8 @@ declare module '@shopify/remix-oxygen' {
     // to change context type, change the return of createAppLoadContext() instead
   }
 
-  interface SessionData extends HydrogenSessionData {
+  interface SessionData {
     // declare local additions to the Remix session data here
+    customerAccessToken: CustomerAccessToken;
   }
 }

```

### 15. package.json



#### File: [`package.json`](/templates/skeleton/package.json)

```diff
index d3638ae4..b64116dd 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -18,11 +18,13 @@
     "@remix-run/server-runtime": "^2.15.3",
     "@shopify/hydrogen": "2025.1.2",
     "@shopify/remix-oxygen": "^2.0.11",
+    "crypto-js": "^4.2.0",
     "graphql": "^16.6.0",
     "graphql-tag": "^2.12.6",
     "isbot": "^5.1.21",
     "react": "^18.2.0",
-    "react-dom": "^18.2.0"
+    "react-dom": "^18.2.0",
+    "snakecase-keys": "^5.5.0"
   },
   "devDependencies": {
     "@eslint/compat": "^1.2.5",
@@ -36,6 +38,7 @@
     "@shopify/oxygen-workers-types": "^4.1.2",
     "@shopify/prettier-config": "^1.1.2",
     "@total-typescript/ts-reset": "^0.4.2",
+    "@types/crypto-js": "^4.2.1",
     "@types/eslint": "^9.6.1",
     "@types/react": "^18.2.22",
     "@types/react-dom": "^18.2.7",

```

### 16. vite.config.ts



#### File: [`vite.config.ts`](/templates/skeleton/vite.config.ts)

```diff
index 56de3011..d26be954 100644
--- a/templates/skeleton/vite.config.ts
+++ b/templates/skeleton/vite.config.ts
@@ -43,7 +43,7 @@ export default defineConfig({
        * Include 'example-dep' in the array below.
        * @see https://vitejs.dev/config/dep-optimization-options
        */
-      include: [],
+      include: ['crypto-js', 'snakecase-keys'],
     },
   },
 });

```

### 17. Codegen



#### File: [`storefrontapi.generated.d.ts`](/templates/skeleton/storefrontapi.generated.d.ts)

<details>

```diff
index d27c5942..c661c3eb 100644
--- a/templates/skeleton/storefrontapi.generated.d.ts
+++ b/templates/skeleton/storefrontapi.generated.d.ts
@@ -366,6 +366,739 @@ export type RecommendedProductsQuery = {
   };
 };
 
+export type CustomerAddressUpdateMutationVariables = StorefrontAPI.Exact<{
+  address: StorefrontAPI.MailingAddressInput;
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  id: StorefrontAPI.Scalars['ID']['input'];
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerAddressUpdateMutation = {
+  customerAddressUpdate?: StorefrontAPI.Maybe<{
+    customerAddress?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.MailingAddress, 'id'>
+    >;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type CustomerAddressDeleteMutationVariables = StorefrontAPI.Exact<{
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  id: StorefrontAPI.Scalars['ID']['input'];
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerAddressDeleteMutation = {
+  customerAddressDelete?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.CustomerAddressDeletePayload,
+      'deletedCustomerAddressId'
+    > & {
+      customerUserErrors: Array<
+        Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+      >;
+    }
+  >;
+};
+
+export type CustomerDefaultAddressUpdateMutationVariables =
+  StorefrontAPI.Exact<{
+    addressId: StorefrontAPI.Scalars['ID']['input'];
+    customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+    country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+    language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+  }>;
+
+export type CustomerDefaultAddressUpdateMutation = {
+  customerDefaultAddressUpdate?: StorefrontAPI.Maybe<{
+    customer?: StorefrontAPI.Maybe<{
+      defaultAddress?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.MailingAddress, 'id'>
+      >;
+    }>;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type CustomerAddressCreateMutationVariables = StorefrontAPI.Exact<{
+  address: StorefrontAPI.MailingAddressInput;
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerAddressCreateMutation = {
+  customerAddressCreate?: StorefrontAPI.Maybe<{
+    customerAddress?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.MailingAddress, 'id'>
+    >;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type OrderMoneyFragment = Pick<
+  StorefrontAPI.MoneyV2,
+  'amount' | 'currencyCode'
+>;
+
+export type AddressFullFragment = Pick<
+  StorefrontAPI.MailingAddress,
+  | 'address1'
+  | 'address2'
+  | 'city'
+  | 'company'
+  | 'country'
+  | 'countryCodeV2'
+  | 'firstName'
+  | 'formatted'
+  | 'id'
+  | 'lastName'
+  | 'name'
+  | 'phone'
+  | 'province'
+  | 'provinceCode'
+  | 'zip'
+>;
+
+export type DiscountApplicationFragment = {
+  value:
+    | ({__typename: 'MoneyV2'} & Pick<
+        StorefrontAPI.MoneyV2,
+        'amount' | 'currencyCode'
+      >)
+    | ({__typename: 'PricingPercentageValue'} & Pick<
+        StorefrontAPI.PricingPercentageValue,
+        'percentage'
+      >);
+};
+
+export type OrderLineProductVariantFragment = Pick<
+  StorefrontAPI.ProductVariant,
+  'id' | 'sku' | 'title'
+> & {
+  image?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Image, 'altText' | 'height' | 'url' | 'id' | 'width'>
+  >;
+  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  product: Pick<StorefrontAPI.Product, 'handle'>;
+};
+
+export type OrderLineItemFullFragment = Pick<
+  StorefrontAPI.OrderLineItem,
+  'title' | 'quantity'
+> & {
+  discountAllocations: Array<{
+    allocatedAmount: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+    discountApplication: {
+      value:
+        | ({__typename: 'MoneyV2'} & Pick<
+            StorefrontAPI.MoneyV2,
+            'amount' | 'currencyCode'
+          >)
+        | ({__typename: 'PricingPercentageValue'} & Pick<
+            StorefrontAPI.PricingPercentageValue,
+            'percentage'
+          >);
+    };
+  }>;
+  originalTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  discountedTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  variant?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
+      image?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.Image, 'altText' | 'height' | 'url' | 'id' | 'width'>
+      >;
+      price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+      product: Pick<StorefrontAPI.Product, 'handle'>;
+    }
+  >;
+};
+
+export type OrderFragment = Pick<
+  StorefrontAPI.Order,
+  | 'id'
+  | 'name'
+  | 'orderNumber'
+  | 'statusUrl'
+  | 'processedAt'
+  | 'fulfillmentStatus'
+> & {
+  totalTaxV2?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
+  >;
+  totalPriceV2: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  subtotalPriceV2?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
+  >;
+  shippingAddress?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.MailingAddress,
+      | 'address1'
+      | 'address2'
+      | 'city'
+      | 'company'
+      | 'country'
+      | 'countryCodeV2'
+      | 'firstName'
+      | 'formatted'
+      | 'id'
+      | 'lastName'
+      | 'name'
+      | 'phone'
+      | 'province'
+      | 'provinceCode'
+      | 'zip'
+    >
+  >;
+  discountApplications: {
+    nodes: Array<{
+      value:
+        | ({__typename: 'MoneyV2'} & Pick<
+            StorefrontAPI.MoneyV2,
+            'amount' | 'currencyCode'
+          >)
+        | ({__typename: 'PricingPercentageValue'} & Pick<
+            StorefrontAPI.PricingPercentageValue,
+            'percentage'
+          >);
+    }>;
+  };
+  lineItems: {
+    nodes: Array<
+      Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
+        discountAllocations: Array<{
+          allocatedAmount: Pick<
+            StorefrontAPI.MoneyV2,
+            'amount' | 'currencyCode'
+          >;
+          discountApplication: {
+            value:
+              | ({__typename: 'MoneyV2'} & Pick<
+                  StorefrontAPI.MoneyV2,
+                  'amount' | 'currencyCode'
+                >)
+              | ({__typename: 'PricingPercentageValue'} & Pick<
+                  StorefrontAPI.PricingPercentageValue,
+                  'percentage'
+                >);
+          };
+        }>;
+        originalTotalPrice: Pick<
+          StorefrontAPI.MoneyV2,
+          'amount' | 'currencyCode'
+        >;
+        discountedTotalPrice: Pick<
+          StorefrontAPI.MoneyV2,
+          'amount' | 'currencyCode'
+        >;
+        variant?: StorefrontAPI.Maybe<
+          Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
+            image?: StorefrontAPI.Maybe<
+              Pick<
+                StorefrontAPI.Image,
+                'altText' | 'height' | 'url' | 'id' | 'width'
+              >
+            >;
+            price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+            product: Pick<StorefrontAPI.Product, 'handle'>;
+          }
+        >;
+      }
+    >;
+  };
+};
+
+export type OrderQueryVariables = StorefrontAPI.Exact<{
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+  orderId: StorefrontAPI.Scalars['ID']['input'];
+}>;
+
+export type OrderQuery = {
+  order?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.Order,
+      | 'id'
+      | 'name'
+      | 'orderNumber'
+      | 'statusUrl'
+      | 'processedAt'
+      | 'fulfillmentStatus'
+    > & {
+      totalTaxV2?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
+      >;
+      totalPriceV2: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+      subtotalPriceV2?: StorefrontAPI.Maybe<
+        Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
+      >;
+      shippingAddress?: StorefrontAPI.Maybe<
+        Pick<
+          StorefrontAPI.MailingAddress,
+          | 'address1'
+          | 'address2'
+          | 'city'
+          | 'company'
+          | 'country'
+          | 'countryCodeV2'
+          | 'firstName'
+          | 'formatted'
+          | 'id'
+          | 'lastName'
+          | 'name'
+          | 'phone'
+          | 'province'
+          | 'provinceCode'
+          | 'zip'
+        >
+      >;
+      discountApplications: {
+        nodes: Array<{
+          value:
+            | ({__typename: 'MoneyV2'} & Pick<
+                StorefrontAPI.MoneyV2,
+                'amount' | 'currencyCode'
+              >)
+            | ({__typename: 'PricingPercentageValue'} & Pick<
+                StorefrontAPI.PricingPercentageValue,
+                'percentage'
+              >);
+        }>;
+      };
+      lineItems: {
+        nodes: Array<
+          Pick<StorefrontAPI.OrderLineItem, 'title' | 'quantity'> & {
+            discountAllocations: Array<{
+              allocatedAmount: Pick<
+                StorefrontAPI.MoneyV2,
+                'amount' | 'currencyCode'
+              >;
+              discountApplication: {
+                value:
+                  | ({__typename: 'MoneyV2'} & Pick<
+                      StorefrontAPI.MoneyV2,
+                      'amount' | 'currencyCode'
+                    >)
+                  | ({__typename: 'PricingPercentageValue'} & Pick<
+                      StorefrontAPI.PricingPercentageValue,
+                      'percentage'
+                    >);
+              };
+            }>;
+            originalTotalPrice: Pick<
+              StorefrontAPI.MoneyV2,
+              'amount' | 'currencyCode'
+            >;
+            discountedTotalPrice: Pick<
+              StorefrontAPI.MoneyV2,
+              'amount' | 'currencyCode'
+            >;
+            variant?: StorefrontAPI.Maybe<
+              Pick<StorefrontAPI.ProductVariant, 'id' | 'sku' | 'title'> & {
+                image?: StorefrontAPI.Maybe<
+                  Pick<
+                    StorefrontAPI.Image,
+                    'altText' | 'height' | 'url' | 'id' | 'width'
+                  >
+                >;
+                price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+                product: Pick<StorefrontAPI.Product, 'handle'>;
+              }
+            >;
+          }
+        >;
+      };
+    }
+  >;
+};
+
+export type OrderItemFragment = Pick<
+  StorefrontAPI.Order,
+  | 'financialStatus'
+  | 'fulfillmentStatus'
+  | 'id'
+  | 'orderNumber'
+  | 'customerUrl'
+  | 'statusUrl'
+  | 'processedAt'
+> & {
+  currentTotalPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
+  lineItems: {
+    nodes: Array<
+      Pick<StorefrontAPI.OrderLineItem, 'title'> & {
+        variant?: StorefrontAPI.Maybe<{
+          image?: StorefrontAPI.Maybe<
+            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'height' | 'width'>
+          >;
+        }>;
+      }
+    >;
+  };
+};
+
+export type CustomerOrdersFragment = Pick<
+  StorefrontAPI.Customer,
+  'numberOfOrders'
+> & {
+  orders: {
+    nodes: Array<
+      Pick<
+        StorefrontAPI.Order,
+        | 'financialStatus'
+        | 'fulfillmentStatus'
+        | 'id'
+        | 'orderNumber'
+        | 'customerUrl'
+        | 'statusUrl'
+        | 'processedAt'
+      > & {
+        currentTotalPrice: Pick<
+          StorefrontAPI.MoneyV2,
+          'amount' | 'currencyCode'
+        >;
+        lineItems: {
+          nodes: Array<
+            Pick<StorefrontAPI.OrderLineItem, 'title'> & {
+              variant?: StorefrontAPI.Maybe<{
+                image?: StorefrontAPI.Maybe<
+                  Pick<
+                    StorefrontAPI.Image,
+                    'url' | 'altText' | 'height' | 'width'
+                  >
+                >;
+              }>;
+            }
+          >;
+        };
+      }
+    >;
+    pageInfo: Pick<
+      StorefrontAPI.PageInfo,
+      'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
+    >;
+  };
+};
+
+export type CustomerOrdersQueryVariables = StorefrontAPI.Exact<{
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  endCursor?: StorefrontAPI.InputMaybe<
+    StorefrontAPI.Scalars['String']['input']
+  >;
+  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
+  startCursor?: StorefrontAPI.InputMaybe<
+    StorefrontAPI.Scalars['String']['input']
+  >;
+}>;
+
+export type CustomerOrdersQuery = {
+  customer?: StorefrontAPI.Maybe<
+    Pick<StorefrontAPI.Customer, 'numberOfOrders'> & {
+      orders: {
+        nodes: Array<
+          Pick<
+            StorefrontAPI.Order,
+            | 'financialStatus'
+            | 'fulfillmentStatus'
+            | 'id'
+            | 'orderNumber'
+            | 'customerUrl'
+            | 'statusUrl'
+            | 'processedAt'
+          > & {
+            currentTotalPrice: Pick<
+              StorefrontAPI.MoneyV2,
+              'amount' | 'currencyCode'
+            >;
+            lineItems: {
+              nodes: Array<
+                Pick<StorefrontAPI.OrderLineItem, 'title'> & {
+                  variant?: StorefrontAPI.Maybe<{
+                    image?: StorefrontAPI.Maybe<
+                      Pick<
+                        StorefrontAPI.Image,
+                        'url' | 'altText' | 'height' | 'width'
+                      >
+                    >;
+                  }>;
+                }
+              >;
+            };
+          }
+        >;
+        pageInfo: Pick<
+          StorefrontAPI.PageInfo,
+          'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
+        >;
+      };
+    }
+  >;
+};
+
+export type CustomerUpdateMutationVariables = StorefrontAPI.Exact<{
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  customer: StorefrontAPI.CustomerUpdateInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerUpdateMutation = {
+  customerUpdate?: StorefrontAPI.Maybe<{
+    customer?: StorefrontAPI.Maybe<
+      Pick<
+        StorefrontAPI.Customer,
+        'acceptsMarketing' | 'email' | 'firstName' | 'id' | 'lastName' | 'phone'
+      >
+    >;
+    customerAccessToken?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
+    >;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type CustomerFragment = Pick<
+  StorefrontAPI.Customer,
+  | 'acceptsMarketing'
+  | 'email'
+  | 'firstName'
+  | 'lastName'
+  | 'numberOfOrders'
+  | 'phone'
+> & {
+  addresses: {
+    nodes: Array<
+      Pick<
+        StorefrontAPI.MailingAddress,
+        | 'id'
+        | 'formatted'
+        | 'firstName'
+        | 'lastName'
+        | 'company'
+        | 'address1'
+        | 'address2'
+        | 'country'
+        | 'province'
+        | 'city'
+        | 'zip'
+        | 'phone'
+      >
+    >;
+  };
+  defaultAddress?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.MailingAddress,
+      | 'id'
+      | 'formatted'
+      | 'firstName'
+      | 'lastName'
+      | 'company'
+      | 'address1'
+      | 'address2'
+      | 'country'
+      | 'province'
+      | 'city'
+      | 'zip'
+      | 'phone'
+    >
+  >;
+};
+
+export type AddressFragment = Pick<
+  StorefrontAPI.MailingAddress,
+  | 'id'
+  | 'formatted'
+  | 'firstName'
+  | 'lastName'
+  | 'company'
+  | 'address1'
+  | 'address2'
+  | 'country'
+  | 'province'
+  | 'city'
+  | 'zip'
+  | 'phone'
+>;
+
+export type CustomerQueryVariables = StorefrontAPI.Exact<{
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerQuery = {
+  customer?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.Customer,
+      | 'acceptsMarketing'
+      | 'email'
+      | 'firstName'
+      | 'lastName'
+      | 'numberOfOrders'
+      | 'phone'
+    > & {
+      addresses: {
+        nodes: Array<
+          Pick<
+            StorefrontAPI.MailingAddress,
+            | 'id'
+            | 'formatted'
+            | 'firstName'
+            | 'lastName'
+            | 'company'
+            | 'address1'
+            | 'address2'
+            | 'country'
+            | 'province'
+            | 'city'
+            | 'zip'
+            | 'phone'
+          >
+        >;
+      };
+      defaultAddress?: StorefrontAPI.Maybe<
+        Pick<
+          StorefrontAPI.MailingAddress,
+          | 'id'
+          | 'formatted'
+          | 'firstName'
+          | 'lastName'
+          | 'company'
+          | 'address1'
+          | 'address2'
+          | 'country'
+          | 'province'
+          | 'city'
+          | 'zip'
+          | 'phone'
+        >
+      >;
+    }
+  >;
+};
+
+export type CustomerActivateMutationVariables = StorefrontAPI.Exact<{
+  id: StorefrontAPI.Scalars['ID']['input'];
+  input: StorefrontAPI.CustomerActivateInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerActivateMutation = {
+  customerActivate?: StorefrontAPI.Maybe<{
+    customerAccessToken?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
+    >;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type CustomerInfoQueryVariables = StorefrontAPI.Exact<{
+  customerAccessToken: StorefrontAPI.Scalars['String']['input'];
+}>;
+
+export type CustomerInfoQuery = {
+  customer?: StorefrontAPI.Maybe<
+    Pick<
+      StorefrontAPI.Customer,
+      'firstName' | 'lastName' | 'phone' | 'email' | 'acceptsMarketing'
+    >
+  >;
+};
+
+export type LoginMutationVariables = StorefrontAPI.Exact<{
+  input: StorefrontAPI.CustomerAccessTokenCreateInput;
+}>;
+
+export type LoginMutation = {
+  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+    customerAccessToken?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
+    >;
+  }>;
+};
+
+export type CustomerRecoverMutationVariables = StorefrontAPI.Exact<{
+  email: StorefrontAPI.Scalars['String']['input'];
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerRecoverMutation = {
+  customerRecover?: StorefrontAPI.Maybe<{
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type CustomerCreateMutationVariables = StorefrontAPI.Exact<{
+  input: StorefrontAPI.CustomerCreateInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerCreateMutation = {
+  customerCreate?: StorefrontAPI.Maybe<{
+    customer?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Customer, 'id'>>;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
+export type RegisterLoginMutationVariables = StorefrontAPI.Exact<{
+  input: StorefrontAPI.CustomerAccessTokenCreateInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type RegisterLoginMutation = {
+  customerAccessTokenCreate?: StorefrontAPI.Maybe<{
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+    customerAccessToken?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
+    >;
+  }>;
+};
+
+export type CustomerResetMutationVariables = StorefrontAPI.Exact<{
+  id: StorefrontAPI.Scalars['ID']['input'];
+  input: StorefrontAPI.CustomerResetInput;
+  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
+  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
+}>;
+
+export type CustomerResetMutation = {
+  customerReset?: StorefrontAPI.Maybe<{
+    customerAccessToken?: StorefrontAPI.Maybe<
+      Pick<StorefrontAPI.CustomerAccessToken, 'accessToken' | 'expiresAt'>
+    >;
+    customerUserErrors: Array<
+      Pick<StorefrontAPI.CustomerUserError, 'code' | 'field' | 'message'>
+    >;
+  }>;
+};
+
 export type ArticleQueryVariables = StorefrontAPI.Exact<{
   articleHandle: StorefrontAPI.Scalars['String']['input'];
   blogHandle: StorefrontAPI.Scalars['String']['input'];
@@ -1185,6 +1918,22 @@ interface GeneratedQueryTypes {
     return: RecommendedProductsQuery;
     variables: RecommendedProductsQueryVariables;
   };
+  '#graphql\n  fragment OrderMoney on MoneyV2 {\n    amount\n    currencyCode\n  }\n  fragment AddressFull on MailingAddress {\n    address1\n    address2\n    city\n    company\n    country\n    countryCodeV2\n    firstName\n    formatted\n    id\n    lastName\n    name\n    phone\n    province\n    provinceCode\n    zip\n  }\n  fragment DiscountApplication on DiscountApplication {\n    value {\n      __typename\n      ... on MoneyV2 {\n        ...OrderMoney\n      }\n      ... on PricingPercentageValue {\n        percentage\n      }\n    }\n  }\n  fragment OrderLineProductVariant on ProductVariant {\n    id\n    image {\n      altText\n      height\n      url\n      id\n      width\n    }\n    price {\n      ...OrderMoney\n    }\n    product {\n      handle\n    }\n    sku\n    title\n  }\n  fragment OrderLineItemFull on OrderLineItem {\n    title\n    quantity\n    discountAllocations {\n      allocatedAmount {\n        ...OrderMoney\n      }\n      discountApplication {\n        ...DiscountApplication\n      }\n    }\n    originalTotalPrice {\n      ...OrderMoney\n    }\n    discountedTotalPrice {\n      ...OrderMoney\n    }\n    variant {\n      ...OrderLineProductVariant\n    }\n  }\n  fragment Order on Order {\n    id\n    name\n    orderNumber\n    statusUrl\n    processedAt\n    fulfillmentStatus\n    totalTaxV2 {\n      ...OrderMoney\n    }\n    totalPriceV2 {\n      ...OrderMoney\n    }\n    subtotalPriceV2 {\n      ...OrderMoney\n    }\n    shippingAddress {\n      ...AddressFull\n    }\n    discountApplications(first: 100) {\n      nodes {\n        ...DiscountApplication\n      }\n    }\n    lineItems(first: 100) {\n      nodes {\n        ...OrderLineItemFull\n      }\n    }\n  }\n  query Order(\n    $country: CountryCode\n    $language: LanguageCode\n    $orderId: ID!\n  ) @inContext(country: $country, language: $language) {\n    order: node(id: $orderId) {\n      ... on Order {\n        ...Order\n      }\n    }\n  }\n': {
+    return: OrderQuery;
+    variables: OrderQueryVariables;
+  };
+  '#graphql\n  #graphql\n  fragment Customer on Customer {\n    acceptsMarketing\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n    defaultAddress {\n      ...Address\n    }\n    email\n    firstName\n    lastName\n    numberOfOrders\n    phone\n  }\n  fragment Address on MailingAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    country\n    province\n    city\n    zip\n    phone\n  }\n\n  query CustomerOrders(\n    $country: CountryCode\n    $customerAccessToken: String!\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      ...CustomerOrders\n    }\n  }\n': {
+    return: CustomerOrdersQuery;
+    variables: CustomerOrdersQueryVariables;
+  };
+  '#graphql\n  query Customer(\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customer(customerAccessToken: $customerAccessToken) {\n      ...Customer\n    }\n  }\n  #graphql\n  fragment Customer on Customer {\n    acceptsMarketing\n    addresses(first: 6) {\n      nodes {\n        ...Address\n      }\n    }\n    defaultAddress {\n      ...Address\n    }\n    email\n    firstName\n    lastName\n    numberOfOrders\n    phone\n  }\n  fragment Address on MailingAddress {\n    id\n    formatted\n    firstName\n    lastName\n    company\n    address1\n    address2\n    country\n    province\n    city\n    zip\n    phone\n  }\n\n': {
+    return: CustomerQuery;
+    variables: CustomerQueryVariables;
+  };
+  '#graphql\n  query CustomerInfo($customerAccessToken: String!) {\n    customer(customerAccessToken: $customerAccessToken) {\n      firstName\n      lastName\n      phone\n      email\n      acceptsMarketing\n    }\n  }\n': {
+    return: CustomerInfoQuery;
+    variables: CustomerInfoQueryVariables;
+  };
   '#graphql\n  query Article(\n    $articleHandle: String!\n    $blogHandle: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    blog(handle: $blogHandle) {\n      articleByHandle(handle: $articleHandle) {\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
     return: ArticleQuery;
     variables: ArticleQueryVariables;
@@ -1235,7 +1984,52 @@ interface GeneratedQueryTypes {
   };
 }
 
-interface GeneratedMutationTypes {}
+interface GeneratedMutationTypes {
+  '#graphql\n  mutation customerAddressUpdate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n    $id: ID!\n    $country: CountryCode\n    $language: LanguageCode\n ) @inContext(country: $country, language: $language) {\n    customerAddressUpdate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n      id: $id\n    ) {\n      customerAddress {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerAddressUpdateMutation;
+    variables: CustomerAddressUpdateMutationVariables;
+  };
+  '#graphql\n  mutation customerAddressDelete(\n    $customerAccessToken: String!,\n    $id: ID!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      deletedCustomerAddressId\n    }\n  }\n': {
+    return: CustomerAddressDeleteMutation;
+    variables: CustomerAddressDeleteMutationVariables;
+  };
+  '#graphql\n  mutation customerDefaultAddressUpdate(\n    $addressId: ID!\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerDefaultAddressUpdate(\n      addressId: $addressId\n      customerAccessToken: $customerAccessToken\n    ) {\n      customer {\n        defaultAddress {\n          id\n        }\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerDefaultAddressUpdateMutation;
+    variables: CustomerDefaultAddressUpdateMutationVariables;
+  };
+  '#graphql\n  mutation customerAddressCreate(\n    $address: MailingAddressInput!\n    $customerAccessToken: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerAddressCreate(\n      address: $address\n      customerAccessToken: $customerAccessToken\n    ) {\n      customerAddress {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerAddressCreateMutation;
+    variables: CustomerAddressCreateMutationVariables;
+  };
+  '#graphql\n  # https://shopify.dev/docs/api/storefront/latest/mutations/customerUpdate\n  mutation customerUpdate(\n    $customerAccessToken: String!,\n    $customer: CustomerUpdateInput!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {\n      customer {\n        acceptsMarketing\n        email\n        firstName\n        id\n        lastName\n        phone\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerUpdateMutation;
+    variables: CustomerUpdateMutationVariables;
+  };
+  '#graphql\n  mutation customerActivate(\n    $id: ID!,\n    $input: CustomerActivateInput!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerActivate(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerActivateMutation;
+    variables: CustomerActivateMutationVariables;
+  };
+  '#graphql\n  mutation login($input: CustomerAccessTokenCreateInput!) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
+    return: LoginMutation;
+    variables: LoginMutationVariables;
+  };
+  '#graphql\n  mutation customerRecover(\n    $email: String!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerRecover(email: $email) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerRecoverMutation;
+    variables: CustomerRecoverMutationVariables;
+  };
+  '#graphql\n  mutation customerCreate(\n    $input: CustomerCreateInput!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerCreate(input: $input) {\n      customer {\n        id\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerCreateMutation;
+    variables: CustomerCreateMutationVariables;
+  };
+  '#graphql\n  mutation registerLogin(\n    $input: CustomerAccessTokenCreateInput!,\n    $country: CountryCode,\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerAccessTokenCreate(input: $input) {\n      customerUserErrors {\n        code\n        field\n        message\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n    }\n  }\n': {
+    return: RegisterLoginMutation;
+    variables: RegisterLoginMutationVariables;
+  };
+  '#graphql\n  mutation customerReset(\n    $id: ID!,\n    $input: CustomerResetInput!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(country: $country, language: $language) {\n    customerReset(id: $id, input: $input) {\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n': {
+    return: CustomerResetMutation;
+    variables: CustomerResetMutationVariables;
+  };
+}
 
 declare module '@shopify/hydrogen' {
   interface StorefrontQueries extends GeneratedQueryTypes {}

```

</details>