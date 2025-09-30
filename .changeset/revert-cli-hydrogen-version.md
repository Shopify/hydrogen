---
'@shopify/cli-hydrogen': patch
---

**What changed:**

## Miniflare v3 upgrade

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

## Additional changes

- Fix defer/streaming in development & preview
- Upgrade Miniflare from v2 to v4 in mini-oxygen package
- Add `--force-client-sourcemap` flag support to the `deploy` command
- Implement proper environment variable quoting for shell metacharacters in `env pull` command
