# Overview

This prompt describes how to implement "Legacy Customer Account Flow" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Implement legacy customer account authentication using the Storefront API

# User Intent Recognition

<user_queries>
- How do I implement customer accounts without the Customer Account API?
- How to use legacy customer authentication in Hydrogen?
- How to migrate from Customer Account API to Storefront API?
- How to implement form-based login in Hydrogen?
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: Login form shows "Invalid credentials" even with correct password
  **Solution**: Ensure the customer account is activated. Check if the store has classic customer accounts enabled, not the new customer accounts.
- **Issue**: "Customer Account API not configured" error
  **Solution**: This recipe replaces the Customer Account API. Make sure all patches were applied successfully and run `npm run codegen`.
- **Issue**: Password reset emails not being sent
  **Solution**: Configure email notifications in Shopify admin under Settings > Notifications. Ensure the customer email is verified.
- **Issue**: Session expires too quickly
  **Solution**: Adjust the session configuration in server.ts to increase the cookie maxAge for longer sessions.
- **Issue**: TypeScript errors about missing types
  **Solution**: Run `npm run codegen` to generate the Storefront API types after applying all patches.
</troubleshooting>

# Recipe Implementation

Here's the legacy-customer-account-flow recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe converts a Hydrogen app from the new Customer Account API authentication
to the legacy customer account flow using the Storefront API. This is useful for stores
that haven't migrated to the new Customer Account API yet or need to maintain compatibility
with existing customer authentication systems.

Key features:
- Full customer registration and login flow with form-based authentication
- Password recovery and reset functionality via email
- Account activation via email tokens
- Customer profile management with editable fields
- Order history with detailed order views
- Address management (create, edit, delete, set default)
- Session-based authentication using customer access tokens
- Secure server-side rendering for all account routes

## Notes

> [!NOTE]
> This uses the deprecated Storefront API customer endpoints instead of the new Customer Account API

> [!NOTE]
> Customer access tokens are stored in session cookies for authentication

> [!NOTE]
> All account routes are server-side rendered for security

> [!NOTE]
> The login/register/recover routes use the account_ prefix to avoid layout nesting

> [!NOTE]
> Account data routes use the account. prefix to inherit the account layout

> [!NOTE]
> Consider migrating to the new Customer Account API for better security and features

## Requirements

- A Shopify store with customer accounts enabled (classic accounts, not new customer accounts)
- Storefront API access with customer read/write permissions
- Email notifications configured in Shopify admin for:
  - Account activation emails
  - Password reset emails
  - Welcome emails (optional)

## New files added to the template by this recipe

- app/routes/account_.activate.$id.$activationToken.tsx
- app/routes/account_.recover.tsx
- app/routes/account_.register.tsx
- app/routes/account_.reset.$id.$resetToken.tsx

## Steps

### Step 1: README.md

Update README to document legacy customer account flow

#### File: /README.md

```diff
@@ -1,10 +1,26 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Skeleton with Legacy Customer Account Flow
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+Hydrogen is Shopify's stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify's full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen, enhanced with legacy customer account authentication flow.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
 
+## Legacy Customer Account Flow
+
+🚨 **Caution**: This legacy authentication strategy will not maintain authentication between your Hydrogen storefront and checkout; for better support, use either the New Customer Accounts strategy or Multipass.
+
+This template includes the legacy customer account flow made with [Storefront API](https://shopify.dev/docs/api/storefront) which provides:
+- Full customer registration and login flow
+- Password recovery and reset functionality  
+- Account activation via email
+- Customer profile management
+- Order history and address management
+- Session-based authentication using customer access tokens
+
+**Note**: Passwordless login with [Customer Account API](https://shopify.dev/docs/api/customer) (introduced Jan 2024) is Shopify's recommended way to build headless customer experiences. Consider migrating to the new API for better security and features.
+
+🗒️ Read about the Customer Account API: [https://www.shopify.com/partners/blog/introducing-customer-account-api-for-headless-stores](https://www.shopify.com/partners/blog/introducing-customer-account-api-for-headless-stores)
+
 ## What's included
 
 - Remix
```

### Step 1: app/components/Header.tsx

Add account link to header navigation

#### File: /app/components/Header.tsx

```diff
@@ -11,7 +11,8 @@ import {useAside} from '~/components/Aside';
 interface HeaderProps {
   header: HeaderQuery;
   cart: Promise<CartApiQueryFragment | null>;
-  isLoggedIn: Promise<boolean>;
+  // @description Use boolean instead of Promise for legacy authentication
+  isLoggedIn: boolean;
   publicStoreDomain: string;
 }
 
@@ -103,11 +104,8 @@ function HeaderCtas({
     <nav className="header-ctas" role="navigation">
       <HeaderMenuMobileToggle />
       <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
-        <Suspense fallback="Sign in">
-          <Await resolve={isLoggedIn} errorElement="Sign in">
-            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in')}
-          </Await>
-        </Suspense>
+        {/* @description Display Account/Sign in based on legacy authentication status */}
+        {isLoggedIn ? 'Account' : 'Sign in'}
       </NavLink>
       <SearchToggle />
       <CartToggle cart={cart} />
```

### Step 1: app/routes/account_.activate.$id.$activationToken.tsx

Add account activation route for email verification

#### File: [account_.activate.$id.$activationToken.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/legacy-customer-account-flow/ingredients/templates/skeleton/app/routes/account_.activate.$id.$activationToken.tsx)

```tsx
import {Form, useActionData, data, redirect} from 'react-router';
import type {Route} from './+types/account_.activate.$id.$activationToken';

type ActionResponse = {
  error: string | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Activate Account'}];
};

export async function loader({context}: Route.LoaderArgs) {
  if (await context.session.get('customerAccessToken')) {
    return redirect('/account');
  }
  return {};
}

export async function action({request, context, params}: Route.ActionArgs) {
  const {session, storefront} = context;
  const {id, activationToken} = params;

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    if (!id || !activationToken) {
      throw new Error('Missing token. The link you followed might be wrong.');
    }

    const form = await request.formData();
    const password = form.has('password') ? String(form.get('password')) : null;
    const passwordConfirm = form.has('passwordConfirm')
      ? String(form.get('passwordConfirm'))
      : null;

    const validPasswords =
      password && passwordConfirm && password === passwordConfirm;

    if (!validPasswords) {
      throw new Error('Passwords do not match');
    }

    const {customerActivate} = await storefront.mutate(
      CUSTOMER_ACTIVATE_MUTATION,
      {
        variables: {
          id: `gid://shopify/Customer/${id}`,
          input: {
            password,
            activationToken,
          },
        },
      },
    );

    if (customerActivate?.customerUserErrors?.length) {
      throw new Error(customerActivate.customerUserErrors[0].message);
    }

    const {customerAccessToken} = customerActivate ?? {};
    if (!customerAccessToken) {
      throw new Error('Could not activate account.');
    }
    session.set('customerAccessToken', customerAccessToken);

    return redirect('/account');
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data({error: error.message}, {status: 400});
    }
    return data({error}, {status: 400});
  }
}

export default function Activate() {
  const action = useActionData<ActionResponse>();
  const error = action?.error ?? null;

  return (
    <div className="account-activate">
      <h1>Activate Account.</h1>
      <p>Create your password to activate your account.</p>
      <Form method="POST">
        <fieldset>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            minLength={8}
            required
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <label htmlFor="passwordConfirm">Re-enter password</label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="current-password"
            placeholder="Re-enter password"
            aria-label="Re-enter password"
            minLength={8}
            required
          />
        </fieldset>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button
          className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
          type="submit"
        >
          Save
        </button>
      </Form>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customeractivate
const CUSTOMER_ACTIVATE_MUTATION = `#graphql
  mutation customerActivate(
    $id: ID!,
    $input: CustomerActivateInput!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerActivate(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

```

### Step 2: app/components/PageLayout.tsx

Update PageLayout to handle account routes

#### File: /app/components/PageLayout.tsx

```diff
@@ -19,7 +19,8 @@ interface PageLayoutProps {
   cart: Promise<CartApiQueryFragment | null>;
   footer: Promise<FooterQuery | null>;
   header: HeaderQuery;
-  isLoggedIn: Promise<boolean>;
+  // @description Use boolean instead of Promise for legacy authentication
+  isLoggedIn: boolean;
   publicStoreDomain: string;
   children?: React.ReactNode;
 }
```

### Step 2: app/routes/account_.recover.tsx

Add password recovery form for forgotten passwords

#### File: [account_.recover.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/legacy-customer-account-flow/ingredients/templates/skeleton/app/routes/account_.recover.tsx)

```tsx
import {Form, Link, useActionData, data, redirect} from 'react-router';
import type {Route} from './+types/account_.recover';

type ActionResponse = {
  error?: string;
  resetRequested?: boolean;
};

export async function loader({context}: Route.LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  if (customerAccessToken) {
    return redirect('/account');
  }

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {storefront} = context;
  const form = await request.formData();
  const email = form.has('email') ? String(form.get('email')) : null;

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    if (!email) {
      throw new Error('Please provide an email.');
    }
    await storefront.mutate(CUSTOMER_RECOVER_MUTATION, {
      variables: {email},
    });

    return {resetRequested: true};
  } catch (error: unknown) {
    const resetRequested = false;
    if (error instanceof Error) {
      return data({error: error.message, resetRequested}, {status: 400});
    }
    return data({error, resetRequested}, {status: 400});
  }
}

export default function Recover() {
  const action = useActionData<ActionResponse>();

  return (
    <div className="account-recover">
      <div>
        {action?.resetRequested ? (
          <>
            <h1>Request Sent.</h1>
            <p>
              If that email address is in our system, you will receive an email
              with instructions about how to reset your password in a few
              minutes.
            </p>
            <br />
            <Link to="/account/login">Return to Login</Link>
          </>
        ) : (
          <>
            <h1>Forgot Password.</h1>
            <p>
              Enter the email address associated with your account to receive a
              link to reset your password.
            </p>
            <br />
            <Form method="POST">
              <fieldset>
                <label htmlFor="email">Email</label>
                <input
                  aria-label="Email address"
                  autoComplete="email"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  id="email"
                  name="email"
                  placeholder="Email address"
                  required
                  type="email"
                />
              </fieldset>
              {action?.error ? (
                <p>
                  <mark>
                    <small>{action.error}</small>
                  </mark>
                </p>
              ) : (
                <br />
              )}
              <button type="submit">Request Reset Link</button>
            </Form>
            <div>
              <br />
              <p>
                <Link to="/account/login">Login →</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerrecover
const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation customerRecover(
    $email: String!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

```

### Step 3: app/root.tsx

Add customer access token validation to root loader

#### File: /app/root.tsx

```diff
@@ -1,5 +1,6 @@
 import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
 import {
+  data,
   Outlet,
   useRouteError,
   isRouteErrorResponse,
@@ -11,6 +12,7 @@ import {
   useRouteLoaderData,
 } from 'react-router';
 import type {Route} from './+types/root';
+import type {CustomerAccessToken} from '@shopify/hydrogen/storefront-api-types';
 import favicon from '~/assets/favicon.svg';
 import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
 import resetStyles from '~/styles/reset.css?url';
@@ -65,6 +67,9 @@ export function links() {
   ];
 }
 
+// @description Export headers for legacy customer account flow
+export const headers: Route.HeadersFunction = ({loaderHeaders}) => loaderHeaders;
+
 export async function loader(args: Route.LoaderArgs) {
   // Start fetching non-critical data without blocking time to first byte
   const deferredData = loadDeferredData(args);
@@ -74,23 +79,38 @@ export async function loader(args: Route.LoaderArgs) {
 
   const {storefront, env} = args.context;
 
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
+  // @description Validate customer access token for legacy authentication
+  const customerAccessToken = await args.context.session.get('customerAccessToken');
+  
+  // validate the customer access token is valid
+  const {isLoggedIn, headers} = await validateCustomerAccessToken(
+    args.context.session,
+    customerAccessToken,
+  );
+
+  return data(
+    {
+      ...deferredData,
+      ...criticalData,
+      // @description Include isLoggedIn status for legacy authentication
+      isLoggedIn,
+      publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
+      shop: getShopAnalytics({
+        storefront,
+        publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
+      }),
+      consent: {
+        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
+        storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+        withPrivacyBanner: false,
+        // localize the privacy banner
+        country: args.context.storefront.i18n.country,
+        language: args.context.storefront.i18n.language,
+      },
     },
-  };
+    // @description Include headers for legacy authentication flow
+    {headers},
+  );
 }
 
 /**
@@ -207,3 +227,39 @@ export function ErrorBoundary() {
     </div>
   );
 }
+
+// @description Validate customer access token for legacy authentication
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
+  session: Route.LoaderArgs['context']['session'],
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

### Step 3: app/routes/account_.register.tsx

Add customer registration form

#### File: [account_.register.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/legacy-customer-account-flow/ingredients/templates/skeleton/app/routes/account_.register.tsx)

```tsx
import {Form, Link, useActionData, data, redirect} from 'react-router';
import type {Route} from './+types/account_.register';
import type {CustomerCreateMutation} from 'storefrontapi.generated';

type ActionResponse = {
  error: string | null;
  newCustomer:
    | NonNullable<CustomerCreateMutation['customerCreate']>['customer']
    | null;
};

export const headers: Route.HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function loader({context}: Route.LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  if (customerAccessToken) {
    return redirect('/account');
  }

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const {storefront, session} = context;
  const form = await request.formData();
  const email = String(form.has('email') ? form.get('email') : '');
  const password = form.has('password') ? String(form.get('password')) : null;
  const passwordConfirm = form.has('passwordConfirm')
    ? String(form.get('passwordConfirm'))
    : null;

  const validPasswords =
    password && passwordConfirm && password === passwordConfirm;

  const validInputs = Boolean(email && password);
  try {
    if (!validPasswords) {
      throw new Error('Passwords do not match');
    }

    if (!validInputs) {
      throw new Error('Please provide both an email and a password.');
    }

    const {customerCreate} = await storefront.mutate(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {email, password},
      },
    });

    if (customerCreate?.customerUserErrors?.length) {
      throw new Error(customerCreate?.customerUserErrors[0].message);
    }

    const newCustomer = customerCreate?.customer;
    if (!newCustomer?.id) {
      throw new Error('Could not create customer');
    }

    // get an access token for the new customer
    const {customerAccessTokenCreate} = await storefront.mutate(
      REGISTER_LOGIN_MUTATION,
      {
        variables: {
          input: {
            email,
            password,
          },
        },
      },
    );

    if (!customerAccessTokenCreate?.customerAccessToken?.accessToken) {
      throw new Error('Missing access token');
    }
    session.set(
      'customerAccessToken',
      customerAccessTokenCreate?.customerAccessToken,
    );

    return data(
      {error: null, newCustomer},
      {
        status: 302,
        headers: {
          Location: '/account',
        },
      },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data({error: error.message}, {status: 400});
    }
    return data({error}, {status: 400});
  }
}

export default function Register() {
  const data = useActionData<ActionResponse>();
  const error = data?.error || null;
  return (
    <div className="login">
      <h1>Register.</h1>
      <Form method="POST">
        <fieldset>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            minLength={8}
            required
          />
          <label htmlFor="passwordConfirm">Re-enter password</label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="current-password"
            placeholder="Re-enter password"
            aria-label="Re-enter password"
            minLength={8}
            required
          />
        </fieldset>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button type="submit">Register</button>
      </Form>
      <br />
      <p>
        <Link to="/account/login">Login →</Link>
      </p>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerCreate
const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate(
    $input: CustomerCreateInput!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customeraccesstokencreate
const REGISTER_LOGIN_MUTATION = `#graphql
  mutation registerLogin(
    $input: CustomerAccessTokenCreateInput!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
` as const;

```

### Step 4: app/routes/account.$.tsx

Convert catch-all route to use Storefront API authentication

#### File: /app/routes/account.$.tsx

```diff
@@ -1,9 +1,9 @@
 import {redirect} from 'react-router';
 import type {Route} from './+types/account.$';
 
-// fallback wild card for all unauthenticated routes in account section
 export async function loader({context}: Route.LoaderArgs) {
-  context.customerAccount.handleAuthStatus();
-
-  return redirect('/account');
+  if (await context.session.get('customerAccessToken')) {
+    return redirect('/account');
+  }
+  return redirect('/account/login');
 }
```

### Step 4: app/routes/account_.reset.$id.$resetToken.tsx

Add password reset form with token validation

#### File: [account_.reset.$id.$resetToken.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/legacy-customer-account-flow/ingredients/templates/skeleton/app/routes/account_.reset.$id.$resetToken.tsx)

```tsx
import {Form, useActionData, data, redirect} from 'react-router';
import type {Route} from './+types/account_.reset.$id.$resetToken';

type ActionResponse = {
  error: string | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Reset Password'}];
};

export async function action({request, context, params}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }
  const {id, resetToken} = params;
  const {session, storefront} = context;

  try {
    if (!id || !resetToken) {
      throw new Error('customer token or id not found');
    }

    const form = await request.formData();
    const password = form.has('password') ? String(form.get('password')) : '';
    const passwordConfirm = form.has('passwordConfirm')
      ? String(form.get('passwordConfirm'))
      : '';
    const validInputs = Boolean(password && passwordConfirm);
    if (validInputs && password !== passwordConfirm) {
      throw new Error('Please provide matching passwords');
    }

    const {customerReset} = await storefront.mutate(CUSTOMER_RESET_MUTATION, {
      variables: {
        id: `gid://shopify/Customer/${id}`,
        input: {password, resetToken},
      },
    });

    if (customerReset?.customerUserErrors?.length) {
      throw new Error(customerReset?.customerUserErrors[0].message);
    }

    if (!customerReset?.customerAccessToken) {
      throw new Error('Access token not found. Please try again.');
    }
    session.set('customerAccessToken', customerReset.customerAccessToken);

    return redirect('/account');
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data({error: error.message}, {status: 400});
    }
    return data({error}, {status: 400});
  }
}

export default function Reset() {
  const action = useActionData<ActionResponse>();

  return (
    <div className="account-reset">
      <h1>Reset Password.</h1>
      <p>Enter a new password for your account.</p>
      <Form method="POST">
        <fieldset>
          <label htmlFor="password">Password</label>
          <input
            aria-label="Password"
            autoComplete="current-password"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            id="password"
            minLength={8}
            name="password"
            placeholder="Password"
            required
            type="password"
          />
          <label htmlFor="passwordConfirm">Re-enter password</label>
          <input
            aria-label="Re-enter password"
            autoComplete="current-password"
            id="passwordConfirm"
            minLength={8}
            name="passwordConfirm"
            placeholder="Re-enter password"
            required
            type="password"
          />
        </fieldset>
        {action?.error ? (
          <p>
            <mark>
              <small>{action.error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        <button type="submit">Reset</button>
      </Form>
      <br />
      <p>
        <a href="/account/login">Back to login →</a>
      </p>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/mutations/customerreset
const CUSTOMER_RESET_MUTATION = `#graphql
  mutation customerReset(
    $id: ID!,
    $input: CustomerResetInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerReset(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

```

### Step 5: app/routes/account.addresses.tsx

Convert address management to use Storefront API mutations

#### File: /app/routes/account.addresses.tsx

```diff
@@ -1,22 +1,14 @@
-import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
-import type {
-  AddressFragment,
-  CustomerFragment,
-} from 'customer-accountapi.generated';
+import type {MailingAddressInput} from '@shopify/hydrogen/storefront-api-types';
+import type {AddressFragment, CustomerFragment} from 'storefrontapi.generated';
 import {
   data,
   Form,
+  redirect,
   useActionData,
   useNavigation,
   useOutletContext,
-  type Fetcher,
 } from 'react-router';
 import type {Route} from './+types/account.addresses';
-import {
-  UPDATE_ADDRESS_MUTATION,
-  DELETE_ADDRESS_MUTATION,
-  CREATE_ADDRESS_MUTATION,
-} from '~/graphql/customer-account/CustomerAddressMutations';
 
 export type ActionResponse = {
   addressId?: string | null;
@@ -32,13 +24,16 @@ export const meta: Route.MetaFunction = () => {
 };
 
 export async function loader({context}: Route.LoaderArgs) {
-  context.customerAccount.handleAuthStatus();
-
+  const {session} = context;
+  const customerAccessToken = await session.get('customerAccessToken');
+  if (!customerAccessToken) {
+    return redirect('/account/login');
+  }
   return {};
 }
 
 export async function action({request, context}: Route.ActionArgs) {
-  const {customerAccount} = context;
+  const {storefront, session} = context;
 
   try {
     const form = await request.formData();
@@ -50,31 +45,26 @@ export async function action({request, context}: Route.ActionArgs) {
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
 
@@ -89,170 +79,134 @@ export async function action({request, context}: Route.ActionArgs) {
       case 'POST': {
         // handle new address creation
         try {
-          const {data, errors} = await customerAccount.mutate(
+          const {customerAddressCreate} = await storefront.mutate(
             CREATE_ADDRESS_MUTATION,
             {
-              variables: {
-                address,
-                defaultAddress,
-                language: customerAccount.i18n.language,
-              },
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
-          }
-
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
-              {
-                status: 400,
-              },
+          const createdAddress = customerAddressCreate?.customerAddress;
+          if (!createdAddress?.id) {
+            throw new Error(
+              'Expected customer address to be created, but the id is missing',
             );
           }
-          return data(
-            {error: {[addressId]: error}},
-            {
-              status: 400,
-            },
-          );
+
+          if (defaultAddress) {
+            const createdAddressId = decodeURIComponent(createdAddress.id);
+            const {customerDefaultAddressUpdate} = await storefront.mutate(
+              UPDATE_DEFAULT_ADDRESS_MUTATION,
+              {
+                variables: {
+                  customerAccessToken: accessToken,
+                  addressId: createdAddressId,
+                },
+              },
+            );
+
+            if (customerDefaultAddressUpdate?.customerUserErrors?.length) {
+              const error = customerDefaultAddressUpdate.customerUserErrors[0];
+              throw new Error(error.message);
+            }
+          }
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
-                language: customerAccount.i18n.language,
+                customerAccessToken: accessToken,
+                id: decodeURIComponent(addressId),
               },
             },
           );
 
-          if (errors?.length) {
-            throw new Error(errors[0].message);
+          const updatedAddress = customerAddressUpdate?.customerAddress;
+
+          if (customerAddressUpdate?.customerUserErrors?.length) {
+            const error = customerAddressUpdate.customerUserErrors[0];
+            throw new Error(error.message);
           }
 
-          if (data?.customerAddressUpdate?.userErrors?.length) {
-            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
-          }
-
-          if (!data?.customerAddressUpdate?.customerAddress) {
-            throw new Error('Customer address update failed.');
-          }
-
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
-              variables: {
-                addressId: decodeURIComponent(addressId),
-                language: customerAccount.i18n.language,
-              },
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
 
@@ -291,21 +245,17 @@ function NewAddressForm() {
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
@@ -331,7 +281,6 @@ function ExistingAddresses({
       {addresses.nodes.map((address) => (
         <AddressForm
           key={address.id}
-          addressId={address.id}
           address={address}
           defaultAddress={defaultAddress}
         >
@@ -360,26 +309,26 @@ function ExistingAddresses({
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
@@ -444,13 +393,13 @@ export function AddressForm({
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
@@ -466,25 +415,24 @@ export function AddressForm({
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
@@ -514,3 +462,98 @@ export function AddressForm({
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

### Step 6: app/routes/account.orders.$id.tsx

Convert order details page to use Storefront API queries

#### File: /app/routes/account.orders.$id.tsx

```diff
@@ -1,67 +1,50 @@
-import {redirect, useLoaderData} from 'react-router';
+import {Link, useLoaderData, redirect} from 'react-router';
 import type {Route} from './+types/account.orders.$id';
-import {Money, Image} from '@shopify/hydrogen';
+import {Money, Image, flattenConnection} from '@shopify/hydrogen';
 import type {
   OrderLineItemFullFragment,
-  OrderQuery,
-} from 'customer-accountapi.generated';
-import {CUSTOMER_ORDER_QUERY} from '~/graphql/customer-account/CustomerOrderQuery';
+  DiscountApplicationFragment,
+} from 'storefrontapi.generated';
 
 export const meta: Route.MetaFunction = ({data}) => {
   return [{title: `Order ${data?.order?.name}`}];
 };
 
 export async function loader({params, context}: Route.LoaderArgs) {
-  const {customerAccount} = context;
+  const {session, storefront} = context;
+
   if (!params.id) {
     return redirect('/account/orders');
   }
 
   const orderId = atob(params.id);
-  const {data, errors}: {data: OrderQuery; errors?: Array<{message: string}>} =
-    await customerAccount.query(CUSTOMER_ORDER_QUERY, {
-      variables: {
-        orderId,
-        language: customerAccount.i18n.language,
-      },
-    });
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
 
-  // Extract line items directly from nodes array
-  const lineItems = order.lineItems.nodes;
+  if (!order || !('lineItems' in order)) {
+    throw new Response('Order not found', {status: 404});
+  }
 
-  // Extract discount applications directly from nodes array
-  const discountApplications = order.discountApplications.nodes;
+  const lineItems = flattenConnection(order.lineItems) as OrderLineItemFullFragment[];
+  const discountApplications = flattenConnection(order.discountApplications) as DiscountApplicationFragment[];
 
-  // Get fulfillment status from first fulfillment node
-  const fulfillmentStatus = order.fulfillments.nodes[0]?.status ?? 'N/A';
-
-  // Get first discount value with proper type checking
-  const firstDiscount = discountApplications[0]?.value;
-
-  // Type guard for MoneyV2 discount
+  const firstDiscount = discountApplications[0];
+  
   const discountValue =
-    firstDiscount?.__typename === 'MoneyV2'
-      ? (firstDiscount as Extract<
-          typeof firstDiscount,
-          {__typename: 'MoneyV2'}
-        >)
+    firstDiscount?.value?.__typename === 'MoneyV2' 
+      ? firstDiscount.value 
       : null;
 
-  // Type guard for percentage discount
   const discountPercentage =
-    firstDiscount?.__typename === 'PricingPercentageValue'
-      ? (
-          firstDiscount as Extract<
-            typeof firstDiscount,
-            {__typename: 'PricingPercentageValue'}
-          >
-        ).percentage
+    firstDiscount?.value?.__typename === 'PricingPercentageValue'
+      ? firstDiscount.value.percentage
       : null;
 
   return {
@@ -69,25 +52,16 @@ export async function loader({params, context}: Route.LoaderArgs) {
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
       <p>Placed on {new Date(order.processedAt!).toDateString()}</p>
-      {order.confirmationNumber && (
-        <p>Confirmation: {order.confirmationNumber}</p>
-      )}
       <br />
       <div>
         <table>
@@ -132,7 +106,7 @@ export default function OrderRoute() {
                 <p>Subtotal</p>
               </th>
               <td>
-                <Money data={order.subtotal!} />
+                <Money data={order.subtotalPriceV2!} />
               </td>
             </tr>
             <tr>
@@ -143,7 +117,7 @@ export default function OrderRoute() {
                 <p>Tax</p>
               </th>
               <td>
-                <Money data={order.totalTax!} />
+                <Money data={order.totalTaxV2!} />
               </td>
             </tr>
             <tr>
@@ -154,7 +128,7 @@ export default function OrderRoute() {
                 <p>Total</p>
               </th>
               <td>
-                <Money data={order.totalPrice!} />
+                <Money data={order.totalPriceV2!} />
               </td>
             </tr>
           </tfoot>
@@ -163,16 +137,17 @@ export default function OrderRoute() {
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
@@ -180,13 +155,13 @@ export default function OrderRoute() {
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
@@ -196,27 +171,145 @@ export default function OrderRoute() {
 
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

### Step 7: app/routes/account.orders._index.tsx

Convert orders list to use Storefront API with pagination

#### File: /app/routes/account.orders._index.tsx

```diff
@@ -1,222 +1,184 @@
-import {
-  Link,
-  useLoaderData,
-  useNavigation,
-  useSearchParams,
-} from 'react-router';
+import {Link, useLoaderData, data, redirect} from 'react-router';
 import type {Route} from './+types/account.orders._index';
-import {useRef} from 'react';
 import {
   Money,
   getPaginationVariables,
-  flattenConnection,
 } from '@shopify/hydrogen';
-import {
-  buildOrderSearchQuery,
-  parseOrderFilters,
-  ORDER_FILTER_FIELDS,
-  type OrderFilterParams,
-} from '~/lib/orderFilters';
-import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
 import type {
   CustomerOrdersFragment,
   OrderItemFragment,
-} from 'customer-accountapi.generated';
+} from 'storefrontapi.generated';
 import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
 
-type OrdersLoaderData = {
-  customer: CustomerOrdersFragment;
-  filters: OrderFilterParams;
-};
-
 export const meta: Route.MetaFunction = () => {
   return [{title: 'Orders'}];
 };
 
 export async function loader({request, context}: Route.LoaderArgs) {
-  const {customerAccount} = context;
-  const paginationVariables = getPaginationVariables(request, {
-    pageBy: 20,
-  });
+  const {session, storefront} = context;
 
-  const url = new URL(request.url);
-  const filters = parseOrderFilters(url.searchParams);
-  const query = buildOrderSearchQuery(filters);
-
-  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
-    variables: {
-      ...paginationVariables,
-      query,
-      language: customerAccount.i18n.language,
-    },
-  });
-
-  if (errors?.length || !data?.customer) {
-    throw Error('Customer orders not found');
+  const customerAccessToken = await session.get('customerAccessToken');
+  if (!customerAccessToken?.accessToken) {
+    return redirect('/account/login');
   }
 
-  return {customer: data.customer, filters};
+  try {
+    const paginationVariables = getPaginationVariables(request, {
+      pageBy: 20,
+    });
+
+    const {customer} = await storefront.query(CUSTOMER_ORDERS_QUERY, {
+      variables: {
+        customerAccessToken: customerAccessToken.accessToken,
+        country: storefront.i18n.country,
+        language: storefront.i18n.language,
+        ...paginationVariables,
+      },
+      cache: storefront.CacheNone(),
+    });
+
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
+  }
 }
 
 export default function Orders() {
-  const {customer, filters} = useLoaderData<OrdersLoaderData>();
+  const data = useLoaderData<typeof loader>();
+  
+  if ('error' in data) {
+    return <div>Error: {data.error}</div>;
+  }
+  
+  const {customer} = data;
   const {orders} = customer;
 
   return (
     <div className="orders">
-      <OrderSearchForm currentFilters={filters} />
-      <OrdersTable orders={orders} filters={filters} />
+      <OrdersTable orders={orders} />
     </div>
   );
 }
 
-function OrdersTable({
-  orders,
-  filters,
-}: {
-  orders: CustomerOrdersFragment['orders'];
-  filters: OrderFilterParams;
-}) {
-  const hasFilters = !!(filters.name || filters.confirmationNumber);
-
+function OrdersTable({orders}: Pick<CustomerOrdersFragment, 'orders'>) {
   return (
-    <div className="acccount-orders" aria-live="polite">
+    <div className="acccount-orders">
       {orders?.nodes.length ? (
         <PaginatedResourceSection connection={orders}>
           {({node: order}) => <OrderItem key={order.id} order={order} />}
         </PaginatedResourceSection>
       ) : (
-        <EmptyOrders hasFilters={hasFilters} />
+        <EmptyOrders />
       )}
     </div>
   );
 }
 
-function EmptyOrders({hasFilters = false}: {hasFilters?: boolean}) {
+function EmptyOrders() {
   return (
     <div>
-      {hasFilters ? (
-        <>
-          <p>No orders found matching your search.</p>
-          <br />
-          <p>
-            <Link to="/account/orders">Clear filters →</Link>
-          </p>
-        </>
-      ) : (
-        <>
-          <p>You haven&apos;t placed any orders yet.</p>
-          <br />
-          <p>
-            <Link to="/collections">Start Shopping →</Link>
-          </p>
-        </>
-      )}
+      <p>You haven&apos;t placed any orders yet.</p>
+      <br />
+      <p>
+        <Link to="/collections">Start Shopping →</Link>
+      </p>
     </div>
   );
 }
 
-function OrderSearchForm({
-  currentFilters,
-}: {
-  currentFilters: OrderFilterParams;
-}) {
-  const [searchParams, setSearchParams] = useSearchParams();
-  const navigation = useNavigation();
-  const isSearching =
-    navigation.state !== 'idle' &&
-    navigation.location?.pathname?.includes('orders');
-  const formRef = useRef<HTMLFormElement>(null);
-
-  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
-    event.preventDefault();
-    const formData = new FormData(event.currentTarget);
-    const params = new URLSearchParams();
-
-    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
-    const confirmationNumber = formData
-      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
-      ?.toString()
-      .trim();
-
-    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
-    if (confirmationNumber)
-      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);
-
-    setSearchParams(params);
-  };
-
-  const hasFilters = currentFilters.name || currentFilters.confirmationNumber;
-
-  return (
-    <form
-      ref={formRef}
-      onSubmit={handleSubmit}
-      className="order-search-form"
-      aria-label="Search orders"
-    >
-      <fieldset className="order-search-fieldset">
-        <legend className="order-search-legend">Filter Orders</legend>
-
-        <div className="order-search-inputs">
-          <input
-            type="search"
-            name={ORDER_FILTER_FIELDS.NAME}
-            placeholder="Order #"
-            aria-label="Order number"
-            defaultValue={currentFilters.name || ''}
-            className="order-search-input"
-          />
-          <input
-            type="search"
-            name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
-            placeholder="Confirmation #"
-            aria-label="Confirmation number"
-            defaultValue={currentFilters.confirmationNumber || ''}
-            className="order-search-input"
-          />
-        </div>
-
-        <div className="order-search-buttons">
-          <button type="submit" disabled={isSearching}>
-            {isSearching ? 'Searching' : 'Search'}
-          </button>
-          {hasFilters && (
-            <button
-              type="button"
-              disabled={isSearching}
-              onClick={() => {
-                setSearchParams(new URLSearchParams());
-                formRef.current?.reset();
-              }}
-            >
-              Clear
-            </button>
-          )}
-        </div>
-      </fieldset>
-    </form>
-  );
-}
-
 function OrderItem({order}: {order: OrderItemFragment}) {
-  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
   return (
     <>
       <fieldset>
         <Link to={`/account/orders/${btoa(order.id)}`}>
-          <strong>#{order.number}</strong>
+          <strong>#{order.orderNumber}</strong>
         </Link>
         <p>{new Date(order.processedAt).toDateString()}</p>
-        {order.confirmationNumber && (
-          <p>Confirmation: {order.confirmationNumber}</p>
-        )}
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
\ No newline at end of file
```

### Step 9: app/routes/account.profile.tsx



#### File: /app/routes/account.profile.tsx

```diff
@@ -1,12 +1,12 @@
-import type {CustomerFragment} from 'customer-accountapi.generated';
-import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
-import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
+import type {CustomerFragment} from 'storefrontapi.generated';
+import type {CustomerUpdateInput} from '@shopify/hydrogen/storefront-api-types';
 import {
-  data,
   Form,
   useActionData,
   useNavigation,
   useOutletContext,
+  data,
+  redirect,
 } from 'react-router';
 import type {Route} from './+types/account.profile';
 
@@ -20,62 +20,79 @@ export const meta: Route.MetaFunction = () => {
 };
 
 export async function loader({context}: Route.LoaderArgs) {
-  context.customerAccount.handleAuthStatus();
-
+  const customerAccessToken = await context.session.get('customerAccessToken');
+  if (!customerAccessToken) {
+    return redirect('/account/login');
+  }
   return {};
 }
 
 export async function action({request, context}: Route.ActionArgs) {
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
-          language: customerAccount.i18n.language,
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
 
@@ -114,6 +131,64 @@ export default function AccountProfile() {
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
@@ -131,3 +206,55 @@ export default function AccountProfile() {
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

### Step 9: app/routes/account.tsx

Convert account layout to use session-based authentication

#### File: /app/routes/account.tsx

```diff
@@ -1,45 +1,105 @@
 import {
-  data as remixData,
   Form,
   NavLink,
   Outlet,
   useLoaderData,
+  data,
+  redirect,
 } from 'react-router';
 import type {Route} from './+types/account';
-import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
+import type {CustomerFragment} from 'storefrontapi.generated';
 
 export function shouldRevalidate() {
   return true;
 }
 
-export async function loader({context}: Route.LoaderArgs) {
-  const {customerAccount} = context;
-  const {data, errors} = await customerAccount.query(
-    CUSTOMER_DETAILS_QUERY,
-    {
-      variables: {
-        language: customerAccount.i18n.language,
-      },
-    },
-  );
+export const headers: Route.HeadersFunction = ({loaderHeaders}) => loaderHeaders;
 
-  if (errors?.length || !data?.customer) {
-    throw new Error('Customer not found');
+export async function loader({request, context}: Route.LoaderArgs) {
+  const {session, storefront} = context;
+  const {pathname} = new URL(request.url);
+  const customerAccessToken = await session.get('customerAccessToken');
+  const isLoggedIn = !!customerAccessToken?.accessToken;
+  const isAccountHome = pathname === '/account' || pathname === '/account/';
+  const isPrivateRoute =
+    /^\/account\/(orders|orders\/.*|profile|addresses|addresses\/.*)$/.test(
+      pathname,
+    );
+
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
+}
+
+export default function Account() {
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
   );
 }
 
-export default function AccountLayout() {
-  const {customer} = useLoaderData<typeof loader>();
-
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
@@ -51,9 +111,7 @@ export default function AccountLayout() {
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
@@ -98,3 +156,50 @@ function Logout() {
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

### Step 10: app/routes/account_.login.tsx

Replace Customer Account API login with Storefront API form

#### File: /app/routes/account_.login.tsx

```diff
@@ -1,7 +1,139 @@
+import {Form, Link, useActionData, data, redirect} from 'react-router';
 import type {Route} from './+types/account_.login';
 
-export async function loader({request, context}: Route.LoaderArgs) {
-  return context.customerAccount.login({
-    countryCode: context.storefront.i18n.country,
-  });
+type ActionResponse = {
+  error: string | null;
+};
+
+export const meta: Route.MetaFunction = () => {
+  return [{title: 'Login'}];
+};
+
+export async function loader({context}: Route.LoaderArgs) {
+  if (await context.session.get('customerAccessToken')) {
+    return redirect('/account');
+  }
+  return {};
 }
+
+export async function action({request, context}: Route.ActionArgs) {
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
+      throw new Error(
+        customerAccessTokenCreate?.customerUserErrors?.[0]?.message ||
+          'Unknown error',
+      );
+    }
+
+    const {customerAccessToken} = customerAccessTokenCreate;
+    session.set('customerAccessToken', customerAccessToken);
+
+    return redirect('/account', {
+      headers: {
+        'Set-Cookie': await session.commit(),
+      },
+    });
+  } catch (error: unknown) {
+    if (error instanceof Error) {
+      return data({error: error.message}, {status: 400});
+    }
+    return data({error}, {status: 400});
+  }
+}
+
+export default function Login() {
+  const actionData = useActionData<ActionResponse>();
+  const error = actionData?.error || null;
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
\ No newline at end of file
```

### Step 11: app/routes/account_.logout.tsx

Replace Customer Account API logout with session cleanup

#### File: /app/routes/account_.logout.tsx

```diff
@@ -1,11 +1,25 @@
-import {redirect} from 'react-router';
+import {data, redirect} from 'react-router';
 import type {Route} from './+types/account_.logout';
 
-// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
+export const meta: Route.MetaFunction = () => {
+  return [{title: 'Logout'}];
+};
+
 export async function loader() {
+  return redirect('/account/login');
+}
+
+export async function action({request, context}: Route.ActionArgs) {
+  const {session} = context;
+  session.unset('customerAccessToken');
+
+  if (request.method !== 'POST') {
+    return data({error: 'Method not allowed'}, {status: 405});
+  }
+
   return redirect('/');
 }
 
-export async function action({context}: Route.ActionArgs) {
-  return context.customerAccount.logout();
-}
+export default function Logout() {
+  return null;
+}
\ No newline at end of file
```

</recipe_implementation>