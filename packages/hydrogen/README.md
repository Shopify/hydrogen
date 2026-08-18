# Hydrogen

Framework agnostic Shopify storefront SDK and packaged agent skills.

## Setup

Run the setup CLI in a storefront project.

```bash
npx @shopify/hydrogen setup
```

The setup command installs `@shopify/hydrogen` into the local project using the detected package manager, then copies the packaged skills into local agent skill directories.

## GraphQL Tooling

Enable Storefront and Customer Account API editor diagnostics with Hydrogen's packed TypeScript plugin:

```json
{
  "compilerOptions": {
    "plugins": [{"name": "@shopify/hydrogen/ts-plugin"}]
  }
}
```

Run the same GraphQL validation headlessly with `npx @shopify/hydrogen gql check --fail-on-warn`, or use `hydrogen gql check --fail-on-warn` in a package script. Both commands use the Shopify schemas packaged with Hydrogen.

The editor plugin generates `storefront-graphql-env.d.ts` and `customer-account-graphql-env.d.ts` at the project root. Add both files to `.gitignore`.

## Customer Account API

Use `@shopify/hydrogen/customer-account` for type-safe Customer Account API requests from server code:

```ts
import { createShopifyRequestContext } from "@shopify/hydrogen";
import * as CAAPI from "@shopify/hydrogen/customer-account";

const CUSTOMER_QUERY = CAAPI.gql(`query { customer { firstName emailAddress { emailAddress } } }`);
const requestContext = createShopifyRequestContext({
  request,
  i18n: { country: "US", language: "EN" },
});

const customerAccount = CAAPI.createCustomerAccountClient({
  shopId: env.SHOP_ID,
  requestContext,
});

const accessToken = await getAccessTokenFromYourServerSession(request);
const customerResult = await customerAccount.graphql(CUSTOMER_QUERY, {
  accessToken,
});
```

Use a numeric Shopify shop ID string from `SHOP_ID`, not a Shop GID or domain. The GraphQL client intentionally receives only the access token that your server-side auth flow has already obtained.

Hydrogen also ships framework-neutral Customer Account OAuth/session helpers. Construct `createCustomerSession()` at module scope with `SHOP_ID` and `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, then pass request-scoped session managers into its methods:

```ts
const customerSession = CAAPI.createCustomerSession({
  shopId: env.SHOP_ID,
  customerAccountApiClientId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
});

const isLoggedIn = await customerSession.isLoggedIn(
  sessionManager,
  requestContext,
);
```

Customer Account OAuth methods require a public HTTPS origin. The writable session manager should expose the request origin; explicit `origin` options are only needed as overrides. Use a tunnel for local development and pass the framework's canonical request URL, not an untrusted forwarded host.

Pass `customerSession` to `createCartServerHandlers({customerSession})` to associate newly created carts with the current customer when the session has a usable access token or successfully refreshed access token, and mark checkout URLs in authenticated cart GET responses with `logged_in=true`.

Use `createCustomerAccountServerHandlers({customerSession})` with `handleShopifyRoutes` to install the default `GET /account/login`, `GET /account/authorize`, `GET /account/refresh`, and `POST /account/logout` handlers. Pass those cart server handlers as `cartServerHandlers` to also keep the browser cart's buyer identity in step with the customer session: authorization and refresh attach the customer to the cart, a definitive refresh rejection and logout detach it. Sync is best-effort — a failed cart mutation never blocks the route's redirect; a failed detach during logout or definitive refresh rejection expires the cart cookie instead. `cartServerHandlers` requires the `customerSession` returned by `createCustomerSession` shared by both handler groups. Pass the same request-scoped `requestContext` and `sessionManager` into `handleShopifyRoutes` once alongside the `storefrontClient`. Session managers can be read-only for `isLoggedIn()` / `getAccessToken()` and writable for cart POST handlers configured with `customerSession`, `getOrRefreshAccessToken()`, `prepareLoginUrl()`, `handleOAuthCallback()`, `logout()`, and registered account handlers. `isLoggedIn()` is a read-only UI/session-presence check: it returns true for a usable access token or a refresh token that can attempt to restore one later. `getAccessToken()` still returns only a currently usable access token and never refreshes.

The login handler respects a sanitized `return_to` search parameter and otherwise redirects back to `defaultPostLoginRedirectPathname` (default `/`). The logout handler redirects through Shopify using `postLogoutRedirectUri` (default `/`) when an ID token is present; otherwise, it redirects directly to `postLogoutRedirectUri`. Apps can still implement their own framework routes when they need custom behavior.

When a writable method can update cookie-backed session state, commit once while finalizing the response and append headers from `await sessionManager.commit?.()` there. After committing session headers, call `requestContext.applyResponseHeaders(response.headers)`. Customer Account session reads and GraphQL calls mark the request context private so the finalizer can prevent public/CDN caching of personalized responses.

Use the GraphQL client from server or edge routes only. Keep Customer Account tokens in protected server session storage or encrypted HttpOnly cookies, not browser-readable storage. Pass the same Shopify request context used by the Storefront client so the Customer Account client can derive the `Origin` header, default language, and final response cache policy from request-scoped data. Keep GraphQL documents static and pass user input through variables. Do not retry Customer Account mutations after a timeout unless the operation is externally idempotent.
