# Customer Account API

Set up Customer Account API only when the storefront needs login, account profile, order history, or account-gated UI. Hydrogen provides typed GraphQL helpers and OAuth/session primitives; the app still owns framework integration, UI, and session storage.

## Configuration

Use server-side configuration for:

- `SHOP_ID` — numeric Shopify shop ID string. Do not use a Shop GID or shop domain.
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` — Customer Account API client ID.
- `CUSTOMER_ACCOUNT_SESSION_SECRET` — private per-app secret for encrypted cookie examples, or replace cookie storage with opaque server-side sessions in production.

Do not expose access tokens, refresh tokens, ID tokens, or session secrets to client components or browser storage.

## Session Module

Create `customerSession` at module scope with `createCustomerSession({ shopId, customerAccountApiClientId })`. Create request-scoped session managers from the framework request, backed by protected server storage or encrypted HttpOnly cookies.

Use the same `requestContext` for Storefront and Customer Account work in a request. Customer Account reads and GraphQL calls mark responses personalized so final response headers must run through `requestContext.applyResponseHeaders()`.

Expose two app-owned session-manager helpers when the framework has both read-only render paths and writable response boundaries:

- Read-only helpers return or accept `ReadonlyCustomerSessionManager`. Use them in Server Components, layouts, loaders, and account header UI.
- Writable helpers return or accept `WritableCustomerSessionManager`. Use them only where the returned response can commit `Set-Cookie`, such as Hydrogen route handlers, route handlers, server functions, middleware/proxy responses, or framework finalizers.

This makes the dangerous path harder to hold wrong: TypeScript rejects `customerSession.getOrRefreshAccessToken()` when the caller only has a `ReadonlyCustomerSessionManager`.

## Route Wiring

Register `createCustomerAccountServerHandlers({ customerSession })` with the app's `handleShopifyRoutes` setup. These handlers own:

- `GET /account/login`
- `GET /account/authorize`
- `GET /account/refresh`
- `POST /account/logout`

Do not reimplement login, authorize, refresh, or logout unless the app needs custom behavior that preserves the same safeguards: sanitized `return_to`, same-origin logout POST checks, `cache-control: no-store`, committed session cookies on the returned response, and request-context response headers.

## Server Rendering

Server-rendered account UI must keep session reads and token refresh separate:

- Use `customerSession.isLoggedIn()` for read-only signed-in UI such as an account link. It treats a refreshable session as logged in without refreshing tokens.
- Use `customerSession.getAccessToken()` before Customer Account GraphQL calls. It returns only a currently usable access token.
- If `isLoggedIn()` is true but `getAccessToken()` returns `undefined`, redirect once to `/account/refresh?return_to=...` from a dynamic server route, then retry the account page after the refresh route commits cookies.
- If `isLoggedIn()` is false, show login UI or redirect to `/account/login` instead of sending the user to `/account/refresh`.
- Include a one-shot refresh guard in `return_to`; if the refreshed page still has no usable access token, fall back to login or an account error state.
- Server Components and layouts should only receive `ReadonlyCustomerSessionManager`, so they cannot call `getOrRefreshAccessToken()`.

Wrap header/account-link UI in the framework's streaming primitive when possible so the shell can render before session state resolves.

## Typed Queries

Use `gql` and `createCustomerAccountClient` from `@shopify/hydrogen/customer-account` in server code only. Pass the access token per GraphQL call. Configure `gql.tada` in multi-schema mode when the app authors both Storefront API and Customer Account API documents, then run `gql.tada check` before treating setup as complete.

## Local OAuth

Customer Account OAuth needs a public HTTPS callback origin. For local examples, use a trusted local HTTPS hostname and register the exact `/account/authorize` callback URL in the Customer Account app configuration.
