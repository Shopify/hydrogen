# Account Page

Create a minimal server-rendered account page and wire it into the navbar. The scaffold step already registered the Customer Account handlers (`/account/login`, `/account/authorize`, `/account/refresh`, `/account/logout`); those are server routes, not UI. This step builds the app-owned UI on top of them: without it the storefront has working auth endpoints and no way for a buyer to see their account or log out.

Invoke the `hydrogen-customer-account` skill for the session/token rules (read-only vs writable session managers, `isLoggedIn()` vs `getAccessToken()`, the one-shot refresh redirect) and follow its Account Page section for the UI contract.

## Requirements

- **Navbar account link.** Add an `/account` link to the navbar. A static link is enough — the account page handles both signed-in and signed-out states. Do not block navbar rendering on session reads.
- **`/account` route**, server-rendered:
  - Signed out: render a sign-in panel with a link to `/account/login?return_to=/account`. The login link must be a full-document navigation (plain `<a>` or the framework link's reload-document mode) — the login handler returns a raw redirect to Shopify's hosted login page that client-side routing cannot follow.
  - Signed in: fetch a minimal profile with the Customer Account API and render it:

    ```ts
    import { gql } from "@shopify/hydrogen/customer-account";

    const CUSTOMER_QUERY = gql(`
      query CurrentCustomer {
        customer {
          firstName
          lastName
          emailAddress {
            emailAddress
          }
        }
      }
    `);
    ```

  - Check GraphQL `errors` and render an error state; a failing Customer Account call must not crash the route.
- **Logout button.** Render a plain HTML form — not the framework's client-side form component:

  ```html
  <form method="post" action="/account/logout">
    <button type="submit">Log out</button>
  </form>
  ```

  The logout handler requires a same-origin POST and returns a raw redirect (to Shopify's logout endpoint when an `id_token` exists). Client-side form handling cannot process that redirect; a native browser submit follows it correctly. This also keeps logout working without JavaScript.
- **No token exposure.** Access, refresh, and ID tokens stay server-side. Only render derived profile fields (name, email); never serialize session or token objects into loader data or HTML.

## OAuth Caveat

Completing a real login requires a public HTTPS origin whose `/account/authorize` callback is registered in the Customer Account app configuration. When the local origin is not registered, verify the signed-out rendering and handler wiring; skip the signed-in checks and say so instead of faking them.

## Continue when

- [ ] The navbar has an `/account` link and it returns 200
- [ ] Signed out, `/account` renders the sign-in panel without touching access tokens
- [ ] `GET /account/login` responds with a redirect to Shopify's login page (curl and check the `location` header)
- [ ] The logout control is a native `<form method="post" action="/account/logout">` — not a client-side form component or a fetch call
- [ ] Signed in (when the origin is registered for OAuth): `/account` renders the customer's name and email, and submitting the logout form signs the buyer out and lands back on the storefront
- [ ] No access/refresh/ID token appears in serialized loader data or page HTML
- [ ] `typecheck` (with `hydrogen gql check` chained) passes with the customer query in place
