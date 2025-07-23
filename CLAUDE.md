# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hydrogen Release Process

### Overview
Hydrogen uses a sophisticated automated release system built on Changesets, GitHub Actions, and npm workspaces. Understanding this flow is critical for contributing effectively.

### Release Flow: From PR to Production

1. **Developer creates PR with changes**
   - If changes affect `packages/*/src/**` or `packages/*/package.json`, a changeset is required
   - Run `npm run changeset add` to create a changeset file **(MANUAL)**
   - Changeset specifies which packages are affected and version bump type (patch/minor/major)

2. **On merge to main, TWO parallel processes occur:**

   a) **Next Release (immediate)** **(AUTOMATIC)**
      - Every push to main (except release commits) triggers `next-release.yml`
      - Creates snapshot version: `0.0.0-next-{SHA}-{timestamp}`
      - ALL packages are published with `next` tag
      - Available immediately for testing latest changes

   b) **Version PR Creation (if changesets exist)** **(AUTOMATIC)**
      - `changesets.yml` workflow runs
      - If changesets are found, creates OR updates "Version Packages" PR
      - PR title: `[ci] release 2025-05` (current latest branch)
      - **Important**: This PR accumulates ALL changesets from merged PRs
      - Multiple PRs can be merged before a release (e.g., 10 PRs = 10 changesets in one Version PR)
      - The Version PR automatically updates as new changesets are merged

3. **Production Release - Batched (manual step)**
   - **Releases are batched**: Maintainers decide when to release (could be after 1 PR or 10 PRs)
   - The Version PR accumulates all pending changesets since last release
   - Maintainer reviews accumulated changes and merges the Version PR when ready **(MANUAL)**
   - On merge, `changesets.yml` publishes to npm with `latest` tag **(AUTOMATIC)**
   - Only packages with changesets get new versions **(AUTOMATIC)**
   - Internal dependencies updated with patch versions **(AUTOMATIC)**
   - Post-release actions:
     - Compiles templates to `dist` branch **(AUTOMATIC)**
     - Sends Slack notification (if Hydrogen package included) **(AUTOMATIC)**

4. **Post-Release: Enabling Upgrades (manual step)**
   - After npm publication, `docs/changelog.json` must be updated **(MANUAL)**
   - This enables the `h2 upgrade` command to detect the new version
   - Without this step, developers cannot upgrade using the CLI
   - Process:
     - Update `docs/changelog.json` with release information **(MANUAL)**
     - Include version, dependencies, features, fixes, and upgrade steps **(MANUAL)**
     - Commit and push to main branch **(MANUAL)**
     - Changes are served via https://hydrogen.shopify.dev/changelog.json **(AUTOMATIC)**

   **How `h2 upgrade` works:**
   - Fetches changelog.json from hydrogen.shopify.dev (proxies to the raw content of this file on the `main` branch in the Hydrogen repo)
   - Compares user's current version against available versions
   - Shows features, fixes, and breaking changes for upgrade path
   - Generates local upgrade instructions file in `.hydrogen/` directory
   - Updates package.json dependencies based on changelog specifications

### Understanding Batched Releases

**Key Point**: Not every merged PR triggers a release!

- When you merge a PR with a changeset, it does NOT immediately release to npm
- Instead, your changeset is added to the "Version Packages" PR
- This PR accumulates changesets from ALL merged PRs since the last release
- Maintainers decide when to merge this PR to trigger an actual release
- This allows batching multiple features/fixes into a single release

**Example Timeline**:
- Monday: 3 PRs merged with changesets → Version PR has 3 changesets
- Tuesday: 2 more PRs merged → Version PR now has 5 changesets
- Wednesday: 4 more PRs merged → Version PR now has 9 changesets
- Thursday: Maintainer merges Version PR → All 9 changes released together

### Multi-Package Releases
- Each package versions independently (no fixed/linked packages in changesets config)
- Single changeset can specify multiple packages
- Example: PR changes both `@shopify/hydrogen` and `@shopify/cli-hydrogen`
  - Both packages listed in changeset
  - Each gets appropriate version bump
  - Published together when Version PR merged

### Other Release Types

**Snapshot Testing (`/snapit`)**
- Comment `/snapit` on any PR
- Creates snapshot version for testing
- Publishes specific packages for PR validation

**Back-fix Releases**
- Push to calver branches (e.g., `2025-01`)
- Publishes with branch name as npm tag
- Used for patching previous versions

### Manual vs Automatic Steps

#### Manual Steps (Human Intervention Required)

1. **Developer Actions**
   - **Create changesets**: Run `npm run changeset add` for any PR with code changes
   - **Write PR descriptions**: Include clear explanations of changes
   - **Request snapshot builds**: Comment `/snapit` on PR to test changes

2. **Maintainer Actions - Regular Releases**
   - **Merge Version PR**: Review and merge the auto-generated "Version Packages" PR to trigger npm publication
   - **Update changelog.json**: After npm release, manually update this file to enable `h2 upgrade` command
   - **Monitor releases**: Verify packages published correctly and Slack notifications sent

3. **Maintainer Actions - Major Version Changes**
   - **Update latestBranch**: Edit `.github/workflows/changesets.yml` line 32 when moving to new major version
     - Example: Change `echo "latestBranch=2025-01"` to `echo "latestBranch=2025-05"`
     - Required quarterly with new Storefront API versions
   - **Configure back-fix branches**: Add old calver branches to `.github/workflows/changesets-back-fix.yml`
     - Enables continued patches to previous versions
     - Never add the current calver branch

#### Automatic Steps (CI/CD Handles)

1. **On Every Push to Main**
   - Next release publishes immediately with tag `next`
   - Version: `0.0.0-next-{SHA}-{timestamp}`
   - All packages published regardless of changesets

2. **When Changesets Exist on Main**
   - Version PR automatically created
   - Title: `[ci] release {latestBranch}`
   - Contains version bumps and CHANGELOG updates

3. **When Version PR is Merged**
   - Packages publish to npm with `latest` tag
   - Only packages with changesets get new versions
   - Templates compile and push to `dist` branch
   - Slack notification sent (if Hydrogen package included)
   - GitHub releases created with changelogs

4. **When `/snapit` is Commented**
   - Snapshot version created for PR
   - Packages published with unique tag
   - PR comment updated with installation instructions

5. **On Push to Calver Branches**
   - Back-fix version PR created
   - Publishes with branch name as npm tag when merged

### Version Strategy
- Hydrogen versions follow calendar versioning (calver)
- Format: `YYYY.MAJOR.MINOR/PATCH`
- Example: `2025.5.0` means:
  - `2025` - year
  - `5` - major release cycle (tied to Storefront API versions)
  - `0` - minor/patch number
- Tied to Shopify Storefront API versions
- Breaking changes possible every 3 months with API updates
- Hydrogen releases a new "major" version with **every** Storefront API version update, regardless of whether or not there are breaking changes between the Storefront API versions


### CLI Dependency Graph
The Hydrogen CLI system works through a plugin architecture:

```
Developer's Project (e.g., skeleton template)
    ├── package.json
    │   └── devDependencies
    │       └── @shopify/cli (~3.80.4)
    │
    └── npm scripts
        └── "shopify hydrogen dev" commands
                    ↓
            @shopify/cli (main CLI)
                    ↓
            @shopify/cli-hydrogen (plugin)
                    ↓
            Hydrogen commands available
```

**How it works:**
- **@shopify/cli**: The main Shopify CLI installed in project's devDependencies
- **@shopify/cli-hydrogen**: Plugin package that adds `hydrogen` subcommands
- When `@shopify/cli` detects `@shopify/cli-hydrogen` in dependencies, it loads the plugin
- This enables commands like `shopify hydrogen dev`, `shopify hydrogen build`, etc.
- The plugin uses oclif framework for command structure and hooks

**Example flow:**
1. Developer runs `npm run dev` in their project
2. This executes `shopify hydrogen dev --codegen`
3. `@shopify/cli` receives the command and delegates to `@shopify/cli-hydrogen`
4. The hydrogen plugin executes the dev server with MiniOxygen

## Essential Commands

### Monorepo Commands
```bash
npm run dev              # Run dev in all packages (Turborepo parallel)
npm run build           # Build all packages
npm run test            # Run all tests in parallel
npm run typecheck       # TypeScript check all packages
npm run lint            # ESLint all packages
npm run format          # Prettier format
npm run changeset add   # Add a changeset for releases
```

### Package-Specific Development
```bash
# Run dev for specific package
cd packages/hydrogen && npm run dev

# Test specific package
cd packages/hydrogen && npm run test

# Run tests in watch mode
cd packages/hydrogen && npm run test:watch

# Build docs for a package
cd packages/hydrogen && npm run build-docs
```

### Template Development
```bash
# Primary development flow
npm run dev:app  # Runs skeleton template in dev mode

# Apply cookbook recipe
cd cookbook && npm run cookbook -- apply --recipe [recipe-name]

# Generate new recipe from changes
cd cookbook && npm run cookbook -- generate --recipe [recipe-name]
```

### Testing Individual Files
```bash
# Vitest is used for testing - run specific test files
cd packages/hydrogen && npx vitest run path/to/test.test.ts
```

## Architecture Overview

### Technology Stack
- **Framework**: React Router 7 (migrated from Remix, but package names still contain "remix")
- **Runtime**: Oxygen (Shopify's edge runtime)
- **Build**: Turborepo for monorepo orchestration
- **Testing**: Vitest for unit tests
- **Bundling**: Various (tsup for packages, Vite for templates)

### Package Dependency Graph
```
@shopify/hydrogen-react (base components)
    ↓
@shopify/hydrogen (framework)
    ↓
@shopify/remix-oxygen (React Router adapter for Oxygen)
    ↓
@shopify/mini-oxygen (local dev server)
    ↓
@shopify/hydrogen-codegen (GraphQL codegen)
    ↓
@shopify/cli-hydrogen (CLI plugin)
    ↓
@shopify/create-hydrogen (project generator)
```

### Key Directories
- `packages/` - Published npm packages
- `templates/skeleton/` - Main development template
- `examples/` - Feature-specific examples
- `cookbook/recipes/` - Reproducible feature implementations

## Vite Build Architecture

### Under the Hood
Vite uses different tools for different parts of the build process:

**Development Server**
- Uses native ES modules in the browser
- ESBuild for fast TypeScript/JSX transformation
- No bundling required - modules served on demand

**Production Build**
- **Rollup** as the primary bundler
- Configured via `rollupOptions` in vite.config.ts
- ESBuild for minification and transformations

### Evidence in Hydrogen Codebase
```typescript
// packages/hydrogen-react/vite.config.ts:23
rollupOptions: {
  external: [...],
  output: {
    preserveModules: true,
    preserveModulesRoot: 'src',
  },
}

// packages/cli/src/commands/hydrogen/build.ts:281
vite.transformWithEsbuild(code, filepath, {
  minify: true,
  minifyWhitespace: true,
  minifySyntax: true,
  // ...
})
```

### Why Rollup for Production?
- Tree-shaking capabilities
- ES module output support
- Plugin ecosystem compatibility
- Efficient code splitting

### Vite's Dual-Engine Approach
1. **Development**: ESBuild (speed-optimized)
   - Transpiles TypeScript/JSX 10-100x faster than traditional bundlers
   - No bundling overhead

2. **Production**: Rollup (optimization-focused)
   - Better tree-shaking than ESBuild
   - More mature plugin ecosystem
   - Finer control over output format

### React Router 7 Context
- Configuration in `react-router.config.ts` (not `remix.config.js`)
- Uses `@react-router/dev` for build tooling
- Some package names still reference "remix"
- Routes follow React Router 7 file conventions
- **Build folder**: React Router defaults to `build` for assets, but Hydrogen and Oxygen expect `dist` (legacy from Remix)

## Oxygen and MiniOxygen Runtime

### Oxygen Hosting Platform
- **Oxygen** is Shopify's global edge hosting platform for Hydrogen storefronts
- Currently built on Cloudflare Workers infrastructure
- Future flexibility: May expand to additional hosting providers alongside or instead of Cloudflare
- Provides production runtime environment specifically optimized for commerce workloads
- Automatic global distribution across edge locations

### MiniOxygen - Local Development Runtime
**MiniOxygen** simulates the Oxygen production environment locally during development.

**Key Features:**
- Built on Cloudflare's `workerd` (the same runtime that powers Cloudflare Workers)
- Uses Miniflare v4 to provide local Worker environment
- Ensures development/production parity - if it works locally, it works in production
- Supports full Worker APIs including KV, Durable Objects, and other bindings
- Provides request logging, debugging, and inspector support

**Architecture:**
```
MiniOxygen
    ├── Worker Runtime (workerd via Miniflare)
    │   ├── Main Hydrogen Worker
    │   └── Middleware Worker (for routing/debugging)
    ├── Assets Server (serves static files)
    └── Debug/Inspector Server
```

### Development Commands

**`shopify hydrogen dev`**
- Starts MiniOxygen in development mode
- Enables hot module replacement (HMR)
- Provides detailed logging and debugging
- Runs on `http://localhost:3000` by default
- Includes GraphiQL explorer and network profiler

**`shopify hydrogen preview`**
- Runs production build in MiniOxygen
- Simulates **exact** production behavior
- No HMR or development features
- Used for final testing before deployment
- Key principle: **If it works with `h2 preview`, it will work in production**

**Preview Command Options:**
```bash
# Run existing build
shopify hydrogen preview

# Build and preview
shopify hydrogen preview --build

# Build, preview, and watch for changes
shopify hydrogen preview --build --watch
```

### Worker Configuration
MiniOxygen creates multiple workers:
1. **Middleware Worker** - Handles routing, profiling, and special endpoints
2. **Main Hydrogen Worker** - Runs your application code
3. **Service Bindings** - Connects workers for debugging and asset serving

### Production Parity Guarantees
- Same V8 isolate environment as production
- Identical request/response handling
- Same security sandbox and limitations
- Matching performance characteristics
- Consistent global object availability

**Important**: Always test with `shopify hydrogen preview` before deploying to ensure production compatibility.
