# Overview

This prompt describes how to implement "Multipass Authentication with Storefront API" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Enable Shopify Plus Multipass authentication using Storefront API for seamless customer login and checkout

# User Intent Recognition

<user_queries>
- How do I set up Multipass authentication in my Hydrogen store?
- How can I use Storefront API for customer authentication instead of Customer Account API?
- How do I implement session-based authentication in Hydrogen?
- How can I maintain customer login state across checkout?
- How do I integrate external authentication with Shopify Plus?
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: ReferenceError: require is not defined (snakecase-keys error)
  **Solution**: The recipe includes a custom ESM-compatible snake_case implementation. Ensure you're using the updated multipassify.server.ts file that doesn't import snakecase-keys
- **Issue**: PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET is undefined
  **Solution**: Add the Multipass secret to your environment variables. You can find this in your Shopify Plus admin under Settings > Checkout > Multipass
- **Issue**: TypeScript error: Property 'PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET' does not exist on type 'Env'
  **Solution**: The recipe adds this type definition to env.d.ts. Run 'npm run typecheck' after applying all patches
- **Issue**: Customer login redirects to Customer Account API login page
  **Solution**: Ensure all account routes have been properly converted to use Storefront API. Check that account_.login.tsx uses the form-based login, not customerAccount.login()
- **Issue**: Multipass checkout button not appearing
  **Solution**: Verify that CartSummary.tsx imports and uses MultipassCheckoutButton component, and that the cart.tsx route has been patched
</troubleshooting>

# Recipe Implementation

Here's the multipass recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe implements Shopify Plus Multipass authentication using the Storefront API instead of the Customer Account API.
It provides session-based authentication with customer access tokens, enabling customers to maintain their logged-in
state across the storefront and checkout process. This is particularly useful for Shopify Plus stores that need to
integrate with external authentication systems or maintain customer sessions across different platforms.

Key features:
- Converts all customer account routes from Customer Account API to Storefront API
- Implements session-based authentication with customer access tokens
- Adds Multipass checkout button for seamless checkout experience
- Provides token validation and automatic token refresh
- Includes complete authentication flow (login, logout, register, recover, reset)

## Notes

> [!NOTE]
> This recipe requires Shopify Plus as Multipass is a Plus-only feature

> [!NOTE]
> The recipe replaces the snakecase-keys npm package with a custom ESM-compatible implementation to work in Worker environments

> [!NOTE]
> All customer authentication is handled through Storefront API mutations instead of Customer Account API

> [!NOTE]
> Session tokens are validated on each request and automatically cleared if expired

## Requirements

- Shopify Plus subscription for Multipass functionality
- PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET environment variable must be set
- React Router 7.8.x or higher

## New files added to the template by this recipe

- app/components/MultipassCheckoutButton.tsx
- app/lib/multipass/multipass.ts
- app/lib/multipass/multipassify.server.ts
- app/lib/multipass/types.ts
- app/routes/account_.activate.$id.$activationToken.tsx
- app/routes/account_.login.multipass.tsx
- app/routes/account_.recover.tsx
- app/routes/account_.register.tsx
- app/routes/account_.reset.$id.$resetToken.tsx

## Steps

### Step 1: README.md

Update README with multipass authentication documentation

#### File: /README.md

```diff
@@ -1,13 +1,15 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Skeleton with Multipass
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+Hydrogen is Shopify's stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify's full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen, enhanced with **Multipass authentication** for seamless checkout experiences.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
+[Learn about Multipass](https://shopify.dev/docs/api/multipass)
 
 ## What's included
 
-- Remix
+### Core Hydrogen Stack
+- Remix (React Router 7.8.x)
 - Hydrogen
 - Oxygen
 - Vite
@@ -18,11 +20,18 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - TypeScript and JavaScript flavors
 - Minimal setup of components and routes
 
+### Multipass Authentication (Shopify Plus)
+- Customer session persistence through checkout
+- Storefront API-based authentication (not Customer Account API)
+- Custom login, registration, and account management
+- Automatic fallback for non-Plus stores
+
 ## Getting started
 
 **Requirements:**
 
 - Node.js version 18.0.0 or higher
+- Shopify store (Shopify Plus for Multipass features)
 
 ```bash
 npm create @shopify/hydrogen@latest
@@ -40,6 +49,88 @@ npm run build
 npm run dev
 ```
 
-## Setup for using Customer Account API (`/account` section)
+## Multipass Setup (Shopify Plus only)
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+### Requirements
+
+- Multipass is available on [Shopify Plus](https://www.shopify.com/plus) plans
+- A Shopify Multipass secret token from [**Settings > Customer accounts**](https://www.shopify.com/admin/settings/customer_accounts)
+- Ensure you have `Classic customer account` options selected to use Multipass
+
+### Configuration
+
+1. **Set environment variables** in your `.env` file:
+
+```env
+# Required for Multipass (Shopify Plus only)
+PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET=your_multipass_secret_here
+
+# Already configured by Hydrogen
+SESSION_SECRET=your_session_secret
+```
+
+2. **Dependencies** (already included):
+- `crypto-js@^4.2.0` - JavaScript library of crypto standards
+- `snakecase-keys@^9.0.2` - Convert object keys to snake case
+- `@types/crypto-js@^4.2.1` - TypeScript types for crypto-js
+
+### Key Multipass Files
+
+| File | Description |
+|------|------------|
+| [`app/components/MultipassCheckoutButton.tsx`](app/components/MultipassCheckoutButton.tsx) | Checkout button that passes customer session to checkout |
+| [`app/lib/multipass/multipass.ts`](app/lib/multipass/multipass.ts) | Client-side utility for multipass URL and token handling |
+| [`app/lib/multipass/multipassify.server.ts`](app/lib/multipass/multipassify.server.ts) | Server-side multipass token generation and parsing |
+| [`app/lib/multipass/types.ts`](app/lib/multipass/types.ts) | TypeScript types for multipass |
+| [`app/routes/account_.login.multipass.tsx`](app/routes/account_.login.multipass.tsx) | API route for multipass token generation |
+
+## Authentication System
+
+This template uses the **Storefront API** for customer authentication instead of the Customer Account API:
+
+### Account Routes
+- `/account/login` - Customer login
+- `/account/register` - New customer registration  
+- `/account/logout` - Logout
+- `/account/recover` - Password recovery
+- `/account/reset/:id/:token` - Password reset
+- `/account/activate/:id/:token` - Account activation
+- `/account` - Account dashboard
+- `/account/profile` - Edit profile
+- `/account/addresses` - Manage addresses
+- `/account/orders` - Order history
+
+### How Multipass Works
+
+1. Customer logs in using email/password
+2. Session stores `customerAccessToken`
+3. When checking out, multipass generates encrypted token
+4. Customer is automatically logged in at Shopify checkout
+
+### Fallback Behavior
+
+For non-Plus stores or when multipass isn't configured:
+- Checkout button works normally
+- Console shows: "Bypassing multipass checkout"
+- Customers use standard Shopify checkout flow
+
+## Troubleshooting
+
+### Multipass Issues
+
+**500 Error on checkout:**
+- Ensure `PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET` is set correctly
+- Verify you have a Shopify Plus plan
+- Check that Classic customer accounts are enabled
+
+**Customer not logged in at checkout:**
+- Verify customer is logged in first at `/account/login`
+- Check that multipass token generation is working
+- Ensure multipass secret hasn't expired
+
+## Learn More
+
+- [Hydrogen Documentation](https://shopify.dev/custom-storefronts/hydrogen)
+- [Multipass Documentation](https://shopify.dev/docs/api/multipass)
+- [Storefront API Authentication](https://shopify.dev/docs/api/storefront/authentication)
+- [Remix Documentation](https://remix.run/docs)
```

### Step 1: app/components/MultipassCheckoutButton.tsx

Add checkout button component that generates multipass tokens

#### File: [MultipassCheckoutButton.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/components/MultipassCheckoutButton.tsx)

```tsx
import React, {useCallback} from 'react';
import {multipass} from '~/lib/multipass/multipass';

type MultipassCheckoutButtonProps = {
  checkoutUrl: string;
  children: React.ReactNode;
  onClick?: () => void;
  redirect?: boolean;
};

/*
  This component attempts to persist the customer session
  state in the checkout by using multipass.
  Note: multipass checkout is a Shopify Plus+ feature only.
*/
export function MultipassCheckoutButton(props: MultipassCheckoutButtonProps) {
  const {children, onClick, checkoutUrl, redirect = true} = props;

  const checkoutHandler = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.preventDefault();
      if (!checkoutUrl) return;

      if (typeof onClick === 'function') {
        onClick();
      }

      /*
       * If they user is logged in we persist it in the checkout,
       * otherwise we log them out of the checkout too.
       */
      await multipass({return_to: checkoutUrl, redirect});
    },
    [redirect, checkoutUrl, onClick],
  );

  return <button onClick={(e) => void checkoutHandler(e)}>{children}</button>;
}
```

### Step 2: app/components/CartSummary.tsx

Add multipass checkout button to cart summary

#### File: /app/components/CartSummary.tsx

```diff
@@ -12,6 +12,8 @@ import {useFetcher} from 'react-router';
 import type {FetcherWithComponents} from 'react-router';
 import {CartWarnings} from '~/components/CartWarnings';
 import {CartUserErrors} from '~/components/CartUserErrors';
+// @description Import MultipassCheckoutButton for Shopify Plus multipass checkout
+import {MultipassCheckoutButton} from '~/components/MultipassCheckoutButton';
 
 type CartSummaryProps = {
   cart: OptimisticCart<CartApiQueryFragment | null>;
@@ -59,9 +61,10 @@ function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
 
   return (
     <div>
-      <a href={checkoutUrl} target="_self">
+      {/* @description Use MultipassCheckoutButton for Shopify Plus stores to persist customer session */}
+      <MultipassCheckoutButton checkoutUrl={checkoutUrl}>
         <p>Continue to Checkout &rarr;</p>
-      </a>
+      </MultipassCheckoutButton>
       <br />
     </div>
   );
```

### Step 2: app/lib/multipass/multipass.ts

Core multipass encryption and token generation utilities

#### File: [multipass.ts](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/lib/multipass/multipass.ts)

```ts
import type {
  MultipassResponse,
  MultipassOptions,
  MultipassTokenResponseType,
} from './types';

/*
  A utility that makes a POST request to the local `/account/login/multipass` endpoint
  to retrieve a multipass `url` and `token` for a given url/customer combination.

  Usage example:
  - Checkout button `onClick` handler.
  - Login button `onClick` handler. (with email required at minimum)
  - Social login buttons `onClick` handler.
*/
export async function multipass(
  options: MultipassOptions,
): Promise<void | MultipassResponse> {
  const {redirect, return_to: returnTo} = options;

  try {
    // Generate multipass token POST `/account/login/multipass`
    const response = await fetch('/account/login/multipass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({return_to: returnTo}),
    });

    if (!response.ok) {
      const message = `${response.status} /multipass response not ok. ${response.statusText}`;
      throw new Error(message);
    }

    // Extract multipass token and url
    const {data, error} = (await response.json()) as MultipassTokenResponseType;

    if (error) {
      throw new Error(error);
    }

    if (!data?.url) {
      throw new Error('Missing multipass url');
    }

    // return the url and token
    if (!redirect) {
      return data;
    }

    // redirect to the multipass url
    window.location.href = data.url;
    return data;
  } catch (error) {
    //@ts-expect-error error might not have message property
    console.log('⚠️ Bypassing multipass checkout due to', error.message);

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!redirect) {
      return {
        url: null,
        token: null,
        error: message,
      };
    }

    if (returnTo) {
      window.location.href = returnTo;
    }

    return {url: null, token: null, error: message};
  }
}
```

### Step 3: app/root.tsx

Add session validation and token refresh logic

#### File: /app/root.tsx

```diff
@@ -1,4 +1,15 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {
+  Analytics,
+  getShopAnalytics,
+  useNonce,
+  type HydrogenSession,
+} from '@shopify/hydrogen';
+
+// @description Define CustomerAccessToken type for multipass
+type CustomerAccessToken = {
+  accessToken: string;
+  expiresAt: string;
+};
 import {
   Outlet,
   useRouteError,
@@ -110,7 +121,14 @@ async function loadCriticalData({context}: Route.LoaderArgs) {
     // Add other queries here, so that they are loaded in parallel
   ]);
 
-  return {header};
+  // @description Validate customer authentication for multipass
+  const customerAccessToken = await context.session.get('customerAccessToken');
+  const isLoggedIn = await validateCustomerAccessToken(
+    context.session,
+    customerAccessToken,
+  );
+
+  return {header, isLoggedIn: Promise.resolve(isLoggedIn)};
 }
 
 /**
@@ -207,3 +225,24 @@ export function ErrorBoundary() {
     </div>
   );
 }
+
+// @description Validate customer access token for multipass authentication
+export async function validateCustomerAccessToken(
+  session: HydrogenSession,
+  customerAccessToken?: CustomerAccessToken,
+) {
+  if (!customerAccessToken?.accessToken || !customerAccessToken?.expiresAt) {
+    return false;
+  }
+
+  const expiresAt = new Date(customerAccessToken.expiresAt).getTime();
+  const dateNow = Date.now();
+  const customerAccessTokenExpired = expiresAt < dateNow;
+
+  if (customerAccessTokenExpired) {
+    session.unset('customerAccessToken');
+    return false;
+  }
+
+  return true;
+}
```

### Step 3: app/lib/multipass/multipassify.server.ts

Server-side multipass token generation with ESM-compatible snake_case

#### File: [multipassify.server.ts](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/lib/multipass/multipassify.server.ts)

```ts
import CryptoJS from 'crypto-js';
import type {MultipassCustomer} from './types';

// Simple snake_case converter for ESM/Worker runtime
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function snakecaseKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(snakecaseKeys);
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = snakecaseKeys(obj[key]);
    }
  }
  return result;
}

/*
  Shopify multipassify implementation for node and v8/worker runtime
  based on crypto-js. This library is used to generate and parse multipass tokens.
  ------------------------------------------------------------
  @see: https://shopify.dev/api/multipass — Shopify multipass
  @see: https://github.com/beaucoo/multipassify — Previous art for Node-only runtime
*/
export class Multipassify {
  private readonly BLOCK_SIZE: number;
  private encryptionKey: CryptoJS.lib.WordArray;
  private signingKey: CryptoJS.lib.WordArray;

  public constructor(secret: string) {
    if (!(typeof secret == 'string' && secret.length > 0)) {
      throw new Error('Invalid Secret');
    }

    this.BLOCK_SIZE = 16;

    // Hash the secret
    const digest = CryptoJS.SHA256(secret);

    // create the encryption and signing keys
    this.encryptionKey = CryptoJS.lib.WordArray.create(
      digest.words.slice(0, this.BLOCK_SIZE / 4),
    );
    this.signingKey = CryptoJS.lib.WordArray.create(
      digest.words.slice(this.BLOCK_SIZE / 4, this.BLOCK_SIZE / 2),
    );

    return this;
  }

  // Generates an auth `token` and `url` for a customer based
  // on the `return_to` url property found in the customer object
  public generate(
    customer: MultipassCustomer,
    shopifyDomain: string,
    request: Request,
  ) {
    if (!shopifyDomain) {
      throw new Error('domain is required');
    }
    if (!customer?.email) {
      throw new Error('customer email is required');
    }

    // Generate a token
    const token = this.generateToken(snakecaseKeys(customer));

    // Get the origin of the request
    const toOrigin = new URL(request.url).origin;

    const redirectToCheckout = customer.return_to
      ? customer.return_to.includes('cart/c') ||
        customer.return_to.includes('checkout')
      : false;

    // if the target url is the checkout, we use the shopify domain liquid auth
    const toUrl = redirectToCheckout
      ? `https://${shopifyDomain}/account/login/multipass/${token}` // uses liquid multipass auth
      : `${toOrigin}/account/login/multipass/${token}`; // uses local multipass verification. @see: api route

    return {url: toUrl, token};
  }

  // Generates a token
  public generateToken(customer: MultipassCustomer): string {
    // Store the current time in ISO8601 format.
    // The token will only be valid for a small time-frame around this timestamp.
    customer.created_at = new Date().toISOString();

    const encrypted = this.encrypt(JSON.stringify(customer));
    const signature = this.sign(encrypted);

    const token = encrypted.concat(signature);
    let token64 = token.toString(CryptoJS.enc.Base64);

    token64 = token64
      .replace(/\+/g, '-') // Replace + with -
      .replace(/\//g, '_'); // Replace / with _

    return token64;
  }

  // encrypt the customer data
  private encrypt(customerText: string) {
    // Use a random IV
    const iv = CryptoJS.lib.WordArray.random(this.BLOCK_SIZE);

    const cipher = CryptoJS.AES.encrypt(customerText, this.encryptionKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Append iv as first block of the encryption
    return iv.concat(cipher.ciphertext);
  }

  // signs the encrypted customer data
  private sign(encrypted: any) {
    return CryptoJS.HmacSHA256(encrypted, this.signingKey);
  }

  // Decrypts the customer data from a multipass token
  public parseToken(token: string): MultipassCustomer {
    // reverse char replaces
    const token64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const tokenBytes = CryptoJS.enc.Base64.parse(token64);

    const encryptLength = tokenBytes.words.length - 8; // all minus 8 words of the signature
    const _encrypted = CryptoJS.lib.WordArray.create(
      tokenBytes.words.slice(0, encryptLength),
    );

    const iv = CryptoJS.lib.WordArray.create(
      _encrypted.words.slice(0, this.BLOCK_SIZE / 4),
    );

    const encrypted = CryptoJS.lib.WordArray.create(
      _encrypted.words.slice(iv.words.length, _encrypted.words.length),
    );

    const encryptedCustomer = CryptoJS.enc.Base64.stringify(encrypted);

    const decryptedCustomer = CryptoJS.AES.decrypt(
      encryptedCustomer,
      this.encryptionKey,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    );

    const customerText = decryptedCustomer.toString(CryptoJS.enc.Utf8);
    const customer = JSON.parse(customerText) as MultipassCustomer;

    // Check if the token is still valid
    const now = new Date().toISOString();
    if (customer.created_at > now) {
      throw new Error('Token expired');
    }

    return customer;
  }
}
```

### Step 4: app/routes/account.$.tsx

Convert catch-all account route to use Storefront API

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

### Step 4: app/lib/multipass/types.ts

TypeScript types for multipass functionality

#### File: [types.ts](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/lib/multipass/types.ts)

```ts
/*
  multipass and multipassify types
*/
export interface MultipassResponse {
  /* the multipass-authenticated targetUrl */
  url: string | null;
  /* the multipass-authenticated token */
  token: string | null;
  /* Errors that occurred while authenticating via multipass. Includes any errors return from /multipass api route */
  error?: string | null;
}

export interface MultipassCustomer {
  /* The customer email of the customer used during authentication */
  email: string;
  /* The `targetUrl` passed in for authentication */
  return_to: string;
  /* additional customer properties such as `acceptsMarketing`, addresses etc. */
  [key: string]: string | boolean | object | object[];
}

export interface MultipassCustomerData {
  customer?: MultipassCustomer;
}

export interface NotAuthResponseType {
  url: string | null;
  error: string | null;
}

export type MultipassOptions = {
  redirect: boolean;
  return_to: string;
};

/*
  api handlers
*/
export interface QueryError {
  message: string;
  code: string;
  field: string;
}

export interface CustomerInfoType {
  email: string;
  return_to: string;
  [key: string]: string | boolean | object | object[];
}

export type MultipassRequestBody = MultipassOptions;

export interface CustomerDataResponseType {
  data: MultipassRequestBody;
  errors: string | null;
}

export interface NotLoggedInResponseType {
  url: string | null;
  error: string | null;
}

export interface MultipassTokenResponseType {
  data: {
    url: string;
    token: string;
  };
  error: string | null;
}
```

### Step 5: app/routes/account_.activate.$id.$activationToken.tsx

Add customer account activation route

#### File: [account_.activate.$id.$activationToken.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/routes/account_.activate.$id.$activationToken.tsx)

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

### Step 6: app/routes/account.addresses.tsx

Convert addresses management to use Storefront API

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
-  data,
   Form,
   useActionData,
   useNavigation,
   useOutletContext,
-  type Fetcher,
+  data,
+  redirect,
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
 
@@ -89,143 +79,119 @@ export async function action({request, context}: Route.ActionArgs) {
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
 
@@ -291,21 +257,17 @@ function NewAddressForm() {
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
@@ -331,7 +293,6 @@ function ExistingAddresses({
       {addresses.nodes.map((address) => (
         <AddressForm
           key={address.id}
-          addressId={address.id}
           address={address}
           defaultAddress={defaultAddress}
         >
@@ -360,26 +321,26 @@ function ExistingAddresses({
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
@@ -444,13 +405,13 @@ export function AddressForm({
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
@@ -466,25 +427,24 @@ export function AddressForm({
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
@@ -514,3 +474,98 @@ export function AddressForm({
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
\ No newline at end of file
```

### Step 6: app/routes/account_.login.multipass.tsx

Add multipass login handler route

#### File: [account_.login.multipass.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/routes/account_.login.multipass.tsx)

```tsx
import {data as remixData, redirect} from 'react-router';
import type {LoaderFunctionArgs, ActionFunctionArgs, HeadersFunction} from 'react-router';
import {Multipassify} from '~/lib/multipass/multipassify.server';
import type {
  CustomerInfoType,
  MultipassRequestBody,
  NotLoggedInResponseType,
} from '~/lib/multipass/types';

export const headers: HeadersFunction = ({actionHeaders}) =>
  actionHeaders;

/*
  Redirect document GET requests to the login page (housekeeping)
*/
export async function loader({params, context}: LoaderFunctionArgs) {
  const customerAccessToken = context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect('/account');
  }
  return redirect('/account/login');
}

/*
  Generates a multipass token for a given customer and return_to url.
  Handles POST requests to `/account/login/multipass`
  expects body: { return_to?: string, customer }
*/
export async function action({request, context}: ActionFunctionArgs) {
  const {session, storefront, env} = context;
  const origin = request.headers.get('Origin') || '';
  const isOptionsReq = request.method === 'OPTIONS';
  const isPostReq = request.method === 'POST';
  let customerAccessToken;
  let customer: CustomerInfoType | undefined | null;

  try {
    // only POST and OPTIONS allowed
    if (!isOptionsReq && !isPostReq) {
      return handleMethodNotAllowed();
    }

    // handle OPTIONS preflight requests
    if (isOptionsReq) {
      return handleOptionsPreflight(origin);
    }

    const body = (await request.json()) as MultipassRequestBody;

    if (!session) {
      return notLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_SESSION',
      });
    }

    // try to grab the customerAccessToken from the session if available
    customerAccessToken = session.get('customerAccessToken')?.accessToken;

    if (!customerAccessToken) {
      return handleLoggedOutResponse({
        return_to: body?.return_to ?? null,
        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      });
    }

    if (customerAccessToken) {
      // Have a customerAccessToken, get the customer
      const response = await storefront.query(CUSTOMER_INFO_QUERY, {
        variables: {
          customerAccessToken,
        },
      });

      customer = response?.customer
        ? ({
            ...response.customer,
            return_to: '',
          } as CustomerInfoType)
        : null;
    }

    // Check if customer has the required fields to create a multipass token
    if (!customer || !customer?.email) {
      return notLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_EMAIL',
      });
    }

    if (typeof customer?.return_to === 'undefined' && !body?.return_to) {
      return notLoggedInResponse({
        url: body?.return_to ?? null,
        error: 'MISSING_RETURN_TO_URL',
      });
    }

    try {
      // @description Check for multipass secret before using
      if (!env.PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET) {
        console.error('Multipass secret not configured');
        return remixData(
          {
            error:
              'Multipass is not configured. Please set PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET.',
          },
          {
            status: 500,
          },
        );
      }

      console.log('Generating multipass token for customer:', customer?.email);

      // generate a multipass url and token
      const multipassify = new Multipassify(
        env.PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET,
      );

      const customerInfo = {
        ...customer,
        created_at: new Date().toISOString(),
        return_to: customer?.return_to || body?.return_to || '',
      } as CustomerInfoType;

      // Generating a token for customer
      const data = multipassify.generate(
        customerInfo,
        env.PUBLIC_STORE_DOMAIN,
        request,
      );

      if (!data?.url) {
        return notLoggedInResponse({
          url: body?.return_to ?? null,
          error: 'FAILED_GENERATING_MULTIPASS',
        });
      }

      // success, return token, url
      return remixData(
        {data: {...data, error: null}},
        {
          status: 200,
          headers: getCorsHeaders(origin),
        },
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(error, null, 2));
      let message = 'unknown error';
      if (error instanceof Error) {
        message = error.message;
        console.error(
          'Multipass generation error:',
          error.message,
          error.stack,
        );
      } else {
        message = JSON.stringify(error);
        console.error('Multipass generation error (non-Error):', error);
      }

      return notLoggedInResponse({
        url: body?.return_to ?? null,
        error: message,
      });
    }
  } catch (error) {
    let message = 'unknown error';
    if (error instanceof Error) {
      message = error.message;
      // eslint-disable-next-line no-console
      console.log('Multipass error:', error.message);
    } else {
      message = JSON.stringify(error);
    }

    return notLoggedInResponse({
      url: null,
      error: message,
    });
  }
}

function handleMethodNotAllowed() {
  return remixData(
    {
      data: null,
      error: 'Method not allowed.',
    },
    {
      status: 405,
      headers: {Allow: 'POST, OPTIONS'},
    },
  );
}

function handleOptionsPreflight(origin: string) {
  return remixData(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Force log out a user in the checkout, if they logged out in the site.
// This fixes the edge-case where a user logs in (app),
// goes to checkout (logged in), then goes back to the app,
// logs out via the app and finally goes back to the checkout
// and the user is still logged in the checkout.
async function handleLoggedOutResponse(options: {
  return_to: string | null;
  checkoutDomain: string | undefined;
}) {
  const {return_to: returnTo, checkoutDomain} = options;
  // Match checkout urls such as:
  // https://checkout.example.com/cart/c/c1-dd274dd3e6dca2f6a6ea899e8fe9b90f?key=6900d0a8b227761f88cf2e523ae2e662
  const isCheckoutReq = /[\w-]{32}\?key/g.test(returnTo || '');

  if (!returnTo || !isCheckoutReq) {
    return notLoggedInResponse({
      url: null,
      error: 'NOT_AUTHORIZED',
    });
  }

  // Force logging off the user in the checkout
  const encodedCheckoutUrl = encodeURIComponent(returnTo);

  // For example, checkoutDomain `checkout.hydrogen.shop` or `shop.example.com` or `{shop}.myshopify.com`.
  const logOutUrl = `https://${checkoutDomain}/account/logout?return_url=${encodedCheckoutUrl}&step=contact_information`;
  return {data: {url: logOutUrl}, error: null};
}

/*
  Helper response when errors occur.
*/
function notLoggedInResponse(options: NotLoggedInResponseType) {
  interface ErrorsType {
    [key: string]: string;
  }

  const ERRORS: ErrorsType = {
    MISSING_SESSION: 'No session found.',
    MISSING_EMAIL: 'Required customer `email` was not provided.',
    MISSING_RETURN_TO_URL:
      'Required customer `return_to` URL was not provided.',
    FAILED_GENERATING_MULTIPASS: 'Could not generate a multipass url.',
    'Invalid Secret': 'Invalid Secret',
    NOT_AUTHORIZED: 'Not authorized.',
  };

  const {url, error: errorKey} = options;

  let error;
  if (!errorKey) {
    error = 'UNKNOWN_ERROR';
  } else {
    error = ERRORS[errorKey] ?? 'UNKNOWN_ERROR';
  }

  // Always return the original URL.
  return {data: {url}, error};
}

function getCorsHeaders(origin: string): {[key: string]: string} {
  // Only requests from these origins will pass pre-flight checks
  const allowedOrigin = [
    origin,
    // Add other domains that you'd like to allow to multipass from
    // 'https://example.com',
  ].find((allowedHost) => origin.includes(allowedHost));

  return {
    'Access-Control-Allow-Origin': `${allowedOrigin}`,
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept',
  };
}

const CUSTOMER_INFO_QUERY = `#graphql
  query CustomerInfo($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      phone
      email
      acceptsMarketing
    }
  }
`;

```

### Step 7: app/routes/account.orders.$id.tsx

Convert order details to use Storefront API

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
@@ -101,7 +75,6 @@ export default function OrderRoute() {
           </thead>
           <tbody>
             {lineItems.map((lineItem, lineItemIndex) => (
-              // eslint-disable-next-line react/no-array-index-key
               <OrderLineRow key={lineItemIndex} lineItem={lineItem} />
             ))}
           </tbody>
@@ -132,29 +105,29 @@ export default function OrderRoute() {
                 <p>Subtotal</p>
               </th>
               <td>
-                <Money data={order.subtotal!} />
+                <Money data={order.subtotalPriceV2!} />
               </td>
             </tr>
             <tr>
               <th scope="row" colSpan={3}>
-                Tax
+                <p>Tax</p>
               </th>
               <th scope="row">
                 <p>Tax</p>
               </th>
               <td>
-                <Money data={order.totalTax!} />
+                <Money data={order.totalTaxV2!} />
               </td>
             </tr>
             <tr>
               <th scope="row" colSpan={3}>
-                Total
+                <p>Total</p>
               </th>
               <th scope="row">
                 <p>Total</p>
               </th>
               <td>
-                <Money data={order.totalPrice!} />
+                <Money data={order.totalPriceV2!} />
               </td>
             </tr>
           </tfoot>
@@ -163,16 +136,17 @@ export default function OrderRoute() {
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
@@ -180,13 +154,13 @@ export default function OrderRoute() {
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
@@ -196,27 +170,144 @@ export default function OrderRoute() {
 
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
\ No newline at end of file
```

### Step 7: app/routes/account_.recover.tsx

Add password recovery route

#### File: [account_.recover.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/routes/account_.recover.tsx)

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

### Step 8: app/routes/account.orders._index.tsx

Convert orders list to use Storefront API

#### File: /app/routes/account.orders._index.tsx

```diff
@@ -1,222 +1,183 @@
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

### Step 8: app/routes/account_.register.tsx

Add customer registration route

#### File: [account_.register.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/routes/account_.register.tsx)

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

### Step 9: app/routes/account.profile.tsx

Convert customer profile management from Customer Account API to Storefront API

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
\ No newline at end of file
```

### Step 10: app/routes/account_.reset.$id.$resetToken.tsx

Add password reset confirmation route

#### File: [account_.reset.$id.$resetToken.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/multipass/ingredients/templates/skeleton/app/routes/account_.reset.$id.$resetToken.tsx)

```tsx
import {data, Form, redirect, useActionData} from 'react-router';
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

### Step 11: app/routes/account.tsx

Convert account layout to use Storefront API customer data

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

### Step 12: app/routes/account_.login.tsx

Replace Customer Account API login with form-based Storefront API login

#### File: /app/routes/account_.login.tsx

```diff
@@ -1,7 +1,134 @@
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
+
```

### Step 13: app/routes/account_.logout.tsx

Implement session-based logout

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

### Step 14: env.d.ts

Add multipass secret environment variable type

#### File: /env.d.ts

```diff
@@ -5,3 +5,9 @@
 
 // Enhance TypeScript's built-in typings.
 import '@total-typescript/ts-reset';
+
+declare global {
+  interface Env {
+    PRIVATE_SHOPIFY_STORE_MULTIPASS_SECRET?: string;
+  }
+}
```

### Step 15: app/routes/cart.tsx

Add multipass URL generation for checkout

#### File: /app/routes/cart.tsx

```diff
@@ -15,9 +15,13 @@ export const meta: Route.MetaFunction = () => {
 export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
 
 export async function action({request, context}: Route.ActionArgs) {
-  const {cart} = context;
+  // @description Get session for multipass customer token persistence
+  const {session, cart} = context;
 
-  const formData = await request.formData();
+  const [formData, customerAccessToken] = await Promise.all([
+    request.formData(),
+    session.get('customerAccessToken'),
+  ]);
 
   const {action, inputs} = CartForm.getFormInput(formData);
 
@@ -74,6 +78,8 @@ export async function action({request, context}: Route.ActionArgs) {
     case CartForm.ACTIONS.BuyerIdentityUpdate: {
       result = await cart.updateBuyerIdentity({
         ...inputs.buyerIdentity,
+        // @description Add customer access token for multipass checkout
+        customerAccessToken: customerAccessToken?.accessToken,
       });
       break;
     }
```

### Step 16: package.json

Add crypto dependencies for multipass token generation

#### File: /package.json

```diff
@@ -15,6 +15,7 @@
   "prettier": "@shopify/prettier-config",
   "dependencies": {
     "@shopify/hydrogen": "2025.5.0",
+    "crypto-js": "^4.2.0",
     "graphql": "^16.10.0",
     "graphql-tag": "^2.12.6",
     "isbot": "^5.1.22",
@@ -36,6 +37,7 @@
     "@shopify/oxygen-workers-types": "^4.1.6",
     "@shopify/prettier-config": "^1.1.2",
     "@total-typescript/ts-reset": "^0.6.1",
+    "@types/crypto-js": "^4.2.2",
     "@types/eslint": "^9.6.1",
     "@types/react": "^18.2.22",
     "@types/react-dom": "^18.2.7",
```

### Step 17: vite.config.ts

Configure Vite for crypto polyfills

#### File: /vite.config.ts

```diff
@@ -23,7 +23,7 @@ export default defineConfig({
        * Include 'example-dep' in the array below.
        * @see https://vitejs.dev/config/dep-optimization-options
        */
-      include: ['set-cookie-parser', 'cookie', 'react-router'],
+      include: ['set-cookie-parser', 'cookie', 'react-router', 'crypto-js'],
     },
   },
   server: {
```

## Deleted Files

- [`templates/skeleton/app/routes/account_.authorize.tsx`](templates/skeleton/app/routes/account_.authorize.tsx)

</recipe_implementation>