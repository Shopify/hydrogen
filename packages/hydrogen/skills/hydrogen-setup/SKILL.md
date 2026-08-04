---
name: hydrogen-setup
description: >
  End-to-end Hydrogen storefront setup orchestrator. Use whenever scaffolding a Hydrogen storefront from scratch into an existing application.
---

# Setting Up Hydrogen

Set up Hydrogen in an existing or new repository by working through the step files in `steps/` in order.

Assume the deterministic Hydrogen setup command has already installed `@shopify/hydrogen` and copied the packaged skills into the app. Do not redo package installation or skill copying from this LLM skill.

## How To Work Through The Steps

Read each step file and complete it fully before opening the next. Every step ends each of its phases with a "Continue when" checklist of observable criteria — do not move to the next phase or step until every criterion passes. Reusable domain knowledge lives in the standalone `hydrogen-*` skills the steps invoke; setup-specific details live in `references/`.

## Verification Discipline

- A "Continue when" checkbox passes only when you observed it pass: run the command, curl the route, or exercise the UI in this session. Reading code you just wrote is not verification.
- After every step that changed code, run the app's `typecheck` script and fix failures before opening the next step. Type errors compound; catching them per-step is cheap, untangling ten steps of drift at the end is not.
- Setup is **not complete** until the final verify step's commands have been executed in this session and passed. If you are about to summarize results and have not just run them, stop and run them. Reporting success with failing or unrun checks is a failed setup, not a finished one.

1. `steps/1-inspect-app.md` — verify basic compatibility, identify the styling approach, detect the framework and its reference files.
2. `steps/2-scaffold.md` — route conventions, environment variable names, server-side env access, Storefront API client with `hydrogen gql check`, API route handlers, Customer Account API.
3. `steps/3-build-home-page.md` — server-rendered home page listing collections and products.
4. `steps/4-collection-and-search.md` — collection and search browsing with URL-synced filters.
5. `steps/5-cart.md` — the `/cart` route with progressive enhancement.
6. `steps/6-product-detail-page.md` — product detail route with variant form and add to cart.
7. `steps/7-shopify-runtime-scripts.md` — Shopify runtime scripts and framework navigation hook.
8. `steps/8-cart-drawer-and-navbar.md` — cart drawer in the root layout, then the navbar with its cart trigger.
9. `steps/9-account-page.md` — account page with customer profile and logout, plus the navbar account link.
10. `steps/10-analytics.md` — consent-gated storefront analytics.
11. `steps/11-verify.md` — the app's own checks, then runtime smoke tests.

## App-Owned Concerns (Out Of Hydrogen Scope)

`@shopify/hydrogen` ships typed Customer Account API queries and low-level Customer Account OAuth/session helpers, but apps still own framework cookie/session adapters, account UI, image optimization, and SEO. Do not invent package exports beyond the documented APIs. Build app-owned concerns with the framework's own primitives and Shopify API data:

- **Account UI / session storage** — the `hydrogen-customer-account` skill wires sessions and OAuth handlers during scaffold, and the account-page step builds the minimal profile + logout UI, but the app owns the framework session adapter, richer account pages, and order history UI. Keep account tokens server-side or in encrypted HttpOnly cookies, and do not retry account mutations after a timeout unless the operation is externally idempotent.
- **Image optimization** — use the framework's image component (or `<img srcset>`) with Shopify CDN URL transforms; do not expect a Hydrogen `Image` component.
- **SEO** — render meta/Open Graph tags and JSON-LD `Product`/`BreadcrumbList` structured data with the framework's head/metadata API using Storefront API data.

Mention these to the user when they are relevant to the storefront being built rather than skipping them silently.

## Stop Conditions

- No `package.json` in the current directory.
- No server-capable framework detected.
- The detected framework is configured for static output only and no server adapter or equivalent request lifecycle is present.
- The user declines to overwrite a conflicting copied skill and the existing skill is too old or incompatible to continue safely.
