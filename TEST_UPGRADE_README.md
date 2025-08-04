# Testing Hydrogen Upgrade with Custom Changelog

This guide explains how to test the `hydrogen upgrade` command with a custom changelog, useful for testing new releases before they're published.

## Prerequisites

- Node.js v18+
- mitmproxy: `brew install --cask mitmproxy`

## Quick Start

### Option 1: Test Local Changes (Most Common)

```bash
# In Hydrogen monorepo - uses local changelog from current branch
npm run test:upgrade -- --path ../my-hydrogen-app

# In your app
./h2-test-upgrade
./h2-test-upgrade --version 2025.5.0
```

### Option 2: Test Specific PR/Commit

```bash
# In Hydrogen monorepo - uses changelog from specific commit
npm run test:upgrade -- --changelogUrl https://github.com/Shopify/hydrogen/blob/YOUR_COMMIT/docs/changelog.json --path ../my-hydrogen-app

# In your app
./h2-test-upgrade --version 2025.5.0
```

## Detailed Usage

### Complete Command

```bash
npm run test:upgrade -- [--changelogUrl <url>] [--path <target-repo>]
```

- `--changelogUrl`: (Optional) GitHub URL of the changelog. If not provided, uses local changelog from current branch
- `--path`: (Optional) Path to your Hydrogen app. Creates h2-test-upgrade script there

### Local Mode (Default)

When no `--changelogUrl` is provided, the proxy serves the local `docs/changelog.json` from your current branch:

```bash
npm run test:upgrade -- --path ../my-app
```

### Remote Mode

To test a specific commit or PR:

```bash
npm run test:upgrade -- --changelogUrl https://github.com/Shopify/hydrogen/blob/abc123/docs/changelog.json --path ../my-app
```

### Manual Upgrade (without --path)

If you don't specify `--path`, run the upgrade manually in your app:

```bash
SHOPIFY_HTTP_PROXY=http://localhost:8888 \
FORCE_CHANGELOG_SOURCE=remote \
NODE_TLS_REJECT_UNAUTHORIZED=0 \
npx @shopify/cli@latest hydrogen upgrade
```

## The h2-test-upgrade Script

When you use `--path`, a script is created that:
- Checks if the proxy is running
- Sets all required environment variables
- Runs the hydrogen upgrade command with `--force` (bypasses git checks)
- Passes through any arguments (like `--version`)
- Is automatically added to .gitignore (if it exists)

## How It Works

1. **Proxy Server**: Intercepts requests to `hydrogen.shopify.dev/changelog.json`
2. **Local Server**: Serves either your local or remote changelog
3. **Transparent**: The upgrade command works normally, just with your changelog

## Example Workflows

### Testing Local Changes

1. Make changes to `docs/changelog.json` in your branch
2. Start proxy: `npm run test:upgrade -- --path ../my-app`
3. Run upgrade: `./h2-test-upgrade --version 2025.5.0`
4. Verify your changes work correctly

### Testing a PR

1. Push changelog changes to GitHub
2. Start proxy: `npm run test:upgrade -- --changelogUrl https://github.com/Shopify/hydrogen/blob/PR_COMMIT/docs/changelog.json --path ../my-app`
3. Run upgrade: `./h2-test-upgrade --version 2025.5.0`
4. Share the exact command with reviewers for testing

## Troubleshooting

- **Port already in use**: Kill existing processes with `pkill -f mitmdump`
- **Proxy not working**: Ensure mitmproxy is installed: `brew install --cask mitmproxy`
- **Certificate errors**: The `NODE_TLS_REJECT_UNAUTHORIZED=0` flag handles this
- **Local changelog not found**: Make sure you're running from the Hydrogen monorepo root