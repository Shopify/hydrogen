---
name: hydrogen-customer-account
description: >
  Customer Account API setup for Hydrogen storefronts. Use when wiring customer
  sessions, login/logout/OAuth route handlers, account profile, order history,
  account-gated UI, cart buyer identity sync, or Customer Account
  GraphQL queries.
---

# Customer Account API

The Customer Account API powers login, account profile, order history, and account-gated UI. Hydrogen provides typed GraphQL helpers and OAuth/session primitives; the app still owns framework integration, UI, and session storage.

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

Register `createCustomerAccountServerHandlers({ customerSession })` with the app's `handleShopifyRoutes` setup.

## Cart Buyer Identity Sync

To keep the browser cart's buyer identity in step with the customer session, create the cart handlers with the same `customerSession` and pass them to the Customer Account handlers:

```ts
import { createCartServerHandlers } from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";

const cartHandlers = createCartServerHandlers({ customerSession });

const customerAccountHandlers = createCustomerAccountServerHandlers({
  customerSession,
  cartServerHandlers: cartHandlers,
});
```

With this wiring, Hydrogen owns the whole loop:

- New carts are created with the current customer's buyer identity when the session has a usable access token or successfully refreshed access token, and authenticated cart reads mark checkout URLs with `logged_in=true` (from the cart handlers' `customerSession` option).
- Authorization and refresh attach the customer to the cart from the request's cart cookie; a definitive refresh rejection detaches it. Transient refresh failures leave the cart untouched.
- Logout detaches the customer from the cart.

Sync is best-effort: a failed cart mutation never blocks the route's redirect. Attach failures are logged and can be retried by a later refresh. If detach fails during logout or definitive refresh rejection, the handler expires the cart cookie so a shared device never keeps a cart bound to the previous customer.

`cartServerHandlers` requires both handler groups to share the `customerSession` returned by `createCustomerSession`; TypeScript rejects cart handlers created without `customerSession`.

The Customer Account handlers own:

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

## Account Page

Hydrogen ships no account UI yet — the app owns it. A storefront with the handlers wired but no account page has working auth endpoints a buyer can never reach. Build at least a minimal `/account` route:

- **Signed out** — render a sign-in panel linking to `/account/login?return_to=/account`. The login link must be a full-document navigation (plain `<a>` or the framework link's reload-document mode): the handler returns a raw redirect to Shopify's hosted login page that client-side routing cannot follow.
- **Signed in** — fetch and render a minimal profile (`customer { firstName lastName emailAddress { emailAddress } }`). Check GraphQL `errors` and render an error state instead of crashing.
- **Logout** — a plain HTML `<form method="post" action="/account/logout">` with a submit button. The handler enforces same-origin POST and returns a raw redirect (to Shopify's logout endpoint when an `id_token` exists); a native browser submit follows it, a client-side form component or fetch call does not. This also keeps logout working without JavaScript. An optional `return_to` search param on the action URL controls the post-logout destination.
- **Navbar** — link to `/account`. A static link is enough; the page handles both states. If showing signed-in state in the header, use `isLoggedIn()` behind the framework's streaming primitive per the Server Rendering rules above.
- Never serialize tokens or session objects into loader data or HTML; render only derived profile fields.

## Typed Queries

Use `gql` and `createCustomerAccountClient` from `@shopify/hydrogen/customer-account` in server code only. Pass the access token per GraphQL call.

The same `@shopify/hydrogen/ts-plugin` and `hydrogen gql check` setup from the `hydrogen-storefront-client` skill validates Customer Account API documents too. If the check is not already chained into the app's `typecheck` package script, add it there (create the script if the app has none), then run it before treating setup as complete — framework typecheck commands do not validate `gql()` documents on their own.

## Local OAuth

Customer Account OAuth needs a public HTTPS callback origin. For local examples, use a trusted local HTTPS hostname and register the exact `/account/authorize` callback URL in the Customer Account app configuration.
