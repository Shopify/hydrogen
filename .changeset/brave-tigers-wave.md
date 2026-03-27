---
"@shopify/hydrogen": minor
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Add Storefront MCP proxy support to enable AI agent integration. Hydrogen now automatically proxies requests to `/api/mcp` to Shopify's Storefront MCP server, which implements the Model Context Protocol specification. This feature is automatically available when `proxyStandardRoutes` is enabled in `createRequestHandler` (the default) — no code changes required. AI assistants like Claude and ChatGPT can connect to Hydrogen storefronts to help customers browse products, manage carts, and access store policies.
