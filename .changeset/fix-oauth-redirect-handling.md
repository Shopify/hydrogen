---
"@shopify/mini-oxygen": major
"@shopify/cli-hydrogen": major
---

Fix OAuth redirect handling and stabilize Customer Account API development flag

## MiniOxygen: Fixed redirect handling for OAuth flows

MiniOxygen now correctly handles external redirects by passing them to the browser instead of following them internally. This ensures OAuth/PKCE authentication flows work properly with React Router's `redirectDocument()` function.

**What changed:**
- Miniflare's `dispatchFetch` now uses `{redirect: 'manual'}` to prevent automatic redirect following
- Fixed `Headers.getSetCookie()` method for proper multi-cookie support
- Added comprehensive test coverage for redirect scenarios

**Before:** External redirects were followed internally, breaking OAuth flows
```js
// Redirects were automatically followed by Miniflare
const response = await mf.dispatchFetch(request);
```

**After:** Redirects are passed to the browser for proper handling
```js
// Redirects are now returned as-is for the browser to handle
const response = await mf.dispatchFetch(request, {redirect: 'manual'});
```

## CLI: Stabilized Customer Account API development flag

The `--customer-account-push` flag is now stable and ready for production use. This flag enables tunneling for local development with Customer Account API OAuth flows.

**Before:** 
```bash
# Flag was experimental with __unstable suffix
shopify hydrogen dev --customer-account-push__unstable
```

**After:**
```bash
# Flag is now stable
shopify hydrogen dev --customer-account-push

# Or use environment variable
SHOPIFY_HYDROGEN_FLAG_CUSTOMER_ACCOUNT_PUSH=true npm run dev
```

This flag automatically:
- Creates a tunnel for your local development server
- Configures the Customer Account API OAuth callback URLs
- Enables testing of the full authentication flow locally