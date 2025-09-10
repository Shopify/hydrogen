# Hydrogen React Router 7.8.x Migration Codemod

This codemod handles Hydrogen-specific migrations to React Router 7.8.x that are not covered by the official Remix to React Router codemod.

## Prerequisites

**IMPORTANT**: You must run the official Remix to React Router codemod first:
```bash
npx codemod remix/2/react-router/upgrade
```

## Usage

After running the official codemod, run this Hydrogen-specific codemod:
```bash
npx codemod shopify/hydrogen-react-router-migration
```

## What This Migrates

### ✅ Route Type System
- Adds `Route` type imports from `./+types/{routeName}`
- Converts `LoaderFunctionArgs` → `Route.LoaderArgs`
- Converts `ActionFunctionArgs` → `Route.ActionArgs`
- Converts `MetaFunction` → `Route.MetaFunction`

### ✅ Context API
- `createAppLoadContext` → `createHydrogenRouterContext`
- Migrates custom context properties to `additionalContext` pattern
- Adds TypeScript module augmentation for custom context
- Updates `context.storefront.i18n` → `context.customerAccount.i18n`

### ✅ Imports
- `@shopify/remix-oxygen` → `@shopify/hydrogen/oxygen`
- Adds error type annotations to catch blocks
- Consolidates duplicate imports

### ✅ Configuration
- Creates `react-router.config.ts` with Hydrogen preset
- Updates package.json scripts
- Updates env.d.ts type references

## Manual Steps After Migration

1. Run `npm install` to update dependencies
2. Run `npm run typecheck` to generate Route types
3. Review and test your application

## Development

To work on this codemod locally:

```bash
cd codemods/hydrogen-react-router-migration
npm install
npm test
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Contributing

See the main Hydrogen repository CONTRIBUTING.md for guidelines.

## Support

- [GitHub Issues](https://github.com/shopify/hydrogen/issues)
- [Hydrogen Documentation](https://shopify.dev/hydrogen)