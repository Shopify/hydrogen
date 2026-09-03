<!-- BEGIN:nextjs-agent-rules -->
 
# This is NOT the Next.js you know
 
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.
 
This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
 
<!-- END:nextjs-agent-rules -->

# Shopify Hydrogen development

This storefront is scaffolded from Shopify's Hydrogen Next.js template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts).

## No store yet?

Until a store is connected, this project reads [mock.shop](https://mock.shop): a public, auth-free Storefront API backed by fictional stores. It isn't one store but many, each on its own host with its own catalog.

- The directory at https://mock.shop/llms.txt lists every store with what it sells and its API URL. The default, `mock.shop` itself, is apparel basics.
- To build against a different store, set `NEXT_PUBLIC_STORE_DOMAIN` in `.env` to that store's host (for example `pets.mock.shop`) and leave `PRIVATE_STOREFRONT_API_TOKEN` empty. Each store describes its own catalog at `https://<store>.mock.shop/llms.txt`.
- Carts work; checkout doesn't, and the Customer Account API isn't available.
- To connect a real store, set `PRIVATE_STOREFRONT_API_TOKEN` and `NEXT_PUBLIC_STORE_DOMAIN` in `.env` (see `.env.example`).
