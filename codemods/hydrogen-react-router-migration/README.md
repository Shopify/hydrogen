# Hydrogen React Router Migration Codemod

Automated migration tool for transitioning Hydrogen v2024.x projects from Remix to React Router v7.

## Overview

This codemod automates the migration of Shopify Hydrogen storefronts from Remix-based routing to React Router v7.8.x, which is required for Hydrogen v2025.x. It handles imports, types, context APIs, and component transformations while preserving your application logic.

## Prerequisites

Before running this codemod:

1. **Run the official Remix to React Router v7 migration** first:
   ```bash
   npx codemod remix/2/react-router/upgrade
   ```
   
   This codemod will automatically detect if the React Router migration has been applied.
   If not, it will exit with instructions to run the official migration first.

2. **Ensure your project has**:
   - Hydrogen v2024.x or later  
   - TypeScript or JavaScript
   - Standard Remix app structure (`/app` directory)

## Usage

Run directly using the codemod registry:

```bash
npx codemod shopify/hydrogen-react-router-migration
```

### With Options

```bash
# Dry run - see what would change without modifying files
npx codemod shopify/hydrogen-react-router-migration --dry-run

# Specify project root
npx codemod shopify/hydrogen-react-router-migration --root ./my-hydrogen-store

# Transform specific files
npx codemod shopify/hydrogen-react-router-migration "app/routes/*.tsx"
```

### Using with jscodeshift directly

If you need more control, you can use jscodeshift directly:

```bash
npx jscodeshift -t https://raw.githubusercontent.com/Shopify/hydrogen/main/codemods/hydrogen-react-router-migration/src/index.ts \
  --parser=tsx \
  --extensions=ts,tsx,js,jsx \
  app/
```

## Division of Work: React Router Codemod vs Hydrogen Codemod

### What the React Router Codemod Handles (Run First)

The official `npx codemod remix/2/react-router/upgrade` handles:

- **Package updates**: Installs `react-router` v7, removes `@remix-run/*` packages
- **Import migrations**: Changes `@remix-run/react` → `react-router`
- **Build configuration**: Updates Vite config to use React Router plugin
- **Route conventions**: Migrates to React Router v7 file conventions
- **Entry files**: Updates `entry.client` and `entry.server`
- **Type generation**: Sets up `+types` folders for route types
- **Basic API changes**: Core Remix → React Router API transformations

### What This Hydrogen Codemod Handles (Run Second)

This codemod focuses on Hydrogen-specific patterns that the React Router codemod doesn't handle:

- **Oxygen-specific imports**: `@shopify/remix-oxygen` → `react-router` or `@shopify/hydrogen/oxygen`
- **Hydrogen context**: `context.storefront.i18n` → `context.customerAccount.i18n`
- **Response utilities**: Additional `defer()` → `data()` transformations for Oxygen
- **Type augmentation**: Hydrogen-specific type exports and augmentations
- **Context creation**: `createAppLoadContext` → `createHydrogenContext` patterns
- **Hydrogen imports**: Ensures `@shopify/hydrogen` imports remain untouched

## What It Transforms

### 1. Import Statements

**From:**
```typescript
import { json, defer, redirect } from '@shopify/hydrogen';
import { Link } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
```

**To:**
```typescript
import { data, redirect, Link } from 'react-router';
import type { Route } from './+types/[route-name]';
```

### 2. Route Types

**From:**
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  // ...
}
```

**To:**
```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  // ...
}
```

### 3. Response Utilities

- `json()` → `data()`
- `defer()` → `data()` (React Router v7 handles streaming automatically)

### 4. Context API

**From:**
```typescript
// app/lib/context.ts
export async function createAppLoadContext(request: Request, env: Env) {
  const hydrogenContext = createHydrogenContext({
    /* ... */
  });
  return {
    ...hydrogenContext,
    customField: 'value',
  };
}
```

**To:**
```typescript
// app/lib/context.ts
export async function createHydrogenRouterContext(request: Request, env: Env) {
  const hydrogenContext = createHydrogenContext({
    /* ... */
  });
  return Object.assign({}, hydrogenContext, {
    customField: 'value',
  });
}

// TypeScript declaration added
declare namespace ReactRouter {
  interface AppLoadContext {
    customField: string;
  }
}
```

### 5. Component Renames

- `<RemixServer>` → `<ServerRouter>`
- `<RemixBrowser>` → `<HydratedRouter>`

### 6. Oxygen Imports

**From:**
```typescript
import { createRequestHandler } from '@shopify/remix-oxygen';
```

**To:**
```typescript
import { createRequestHandler } from '@shopify/hydrogen/oxygen';
```

### 7. Virtual Modules

- `virtual:remix/server-build` → `virtual:react-router/server-build`

### 8. Error Handling

Adds TypeScript type annotations to catch blocks:

**From:**
```typescript
try {
  // ...
} catch (error) {
  console.error(error);
}
```

**To:**
```typescript
try {
  // ...
} catch (error: unknown) {
  console.error(error);
}
```

### 9. Type Re-exports

**From:**
```typescript
export type { LoaderArgs, ActionArgs } from '@remix-run/node';
```

**To:**
```typescript
import type { Route } from './+types/[route-name]';
export type LoaderArgs = Route.LoaderArgs;
export type ActionArgs = Route.ActionArgs;
```

## Package.json Updates

The codemod will update your `package.json`:

- Adds `react-router` dependency
- Updates `@shopify/cli` to latest version
- Adds necessary type packages
- Updates scripts to use React Router commands

## File Structure

The codemod handles these file patterns:

- `app/routes/**/*.{ts,tsx,js,jsx}` - Route files
- `app/entry.*.{ts,tsx,js,jsx}` - Entry points
- `app/root.{ts,tsx,js,jsx}` - Root component
- `app/lib/context.{ts,js}` - Context creation
- `server.{ts,js}` - Server configuration
- `vite.config.{ts,js}` - Vite configuration

## Advanced Configuration

### Custom Context Fields

If you have custom context fields, the codemod will:
1. Detect them automatically
2. Generate TypeScript declarations
3. Update the context creation function

### Mixed JavaScript/TypeScript Projects

The codemod handles mixed codebases:
- TypeScript files use type imports
- JavaScript files use JSDoc comments
- Preserves existing type annotations

## Validation and Safety

The codemod includes built-in validation:

- **Pre-transformation checks**: Ensures prerequisites are met
- **Post-transformation validation**: Verifies output correctness
- **File integrity checks**: Prevents data loss
- **Syntax validation**: Ensures valid output
- **Error recovery**: Gracefully handles and reports errors

## Manual Steps After Migration

1. **Update your Vite config** to use React Router plugin:
   ```typescript
   import { reactRouter } from '@react-router/dev/vite';
   import { hydrogen } from '@shopify/hydrogen/vite';
   
   export default defineConfig({
     plugins: [
       reactRouter(),
       hydrogen(),
       // other plugins...
     ],
   });
   ```

2. **Run type generation**:
   ```bash
   npm run typecheck
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Test your application**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Common Issues

**"Cannot find module './+types/...' error"**
- Ensure you've run the official Remix to React Router migration first
- Run `npm run typecheck` to generate route types

**"Multiple imports from same source"**
- The codemod automatically consolidates duplicate imports
- Review and clean up any remaining duplicates

**"Context type errors"**
- Check that custom context fields are properly declared
- Ensure the TypeScript declaration was added correctly

**"RemixServer is not defined"**
- Component should have been renamed to ServerRouter
- Check if the component is imported correctly

### Debug Mode

Run with verbose output:
```bash
DEBUG=* npx @shopify/hydrogen-react-router-migration
```

## Development

To work on this codemod locally:

```bash
cd codemods/hydrogen-react-router-migration
npm install
npm test
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/transformations/imports.test.ts

# Run with coverage
npm test -- --coverage
```

### Project Structure

```
hydrogen-react-router-migration/
├── src/
│   ├── index.ts                    # Main transformer
│   ├── detectors/                  # File and project detection
│   │   ├── prerequisites.ts
│   │   ├── language.ts
│   │   └── file-filter.ts
│   ├── strategies/                 # Language-specific strategies
│   │   ├── typescript.ts
│   │   └── javascript.ts
│   ├── transformations/            # Core transformations
│   │   ├── imports.ts
│   │   ├── route-types.ts
│   │   ├── context-api.ts
│   │   ├── components.ts
│   │   └── package-json.ts
│   └── utils/                      # Utilities
│       ├── error-handler.ts
│       └── validation.ts
├── fixtures/                       # Test fixtures
└── tests/                         # Test files
```

## Contributing

Found an issue or have a suggestion? Please open an issue on [GitHub](https://github.com/Shopify/hydrogen).

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## Support

- [GitHub Issues](https://github.com/shopify/hydrogen/issues)
- [Hydrogen Documentation](https://shopify.dev/hydrogen)
- [Discord Community](https://discord.gg/shopifydevs)

## License

MIT © Shopify