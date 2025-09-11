# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

#### Core Transformations
- Route type system transformation with `Route.LoaderArgs`, `Route.ActionArgs`, `Route.MetaFunction`
- Context API migration from `createAppLoadContext` to `createHydrogenRouterContext`
- Import statement migrations for React Router v7 compatibility
- Component renames: `RemixServer` → `ServerRouter`, `RemixBrowser` → `HydratedRouter`
- Package.json automatic updates with dependency management
- Type re-export transformation for `LoaderArgs` and `ActionArgs`

#### Hydrogen-Specific Features
- `context.storefront.i18n` → `context.customerAccount.i18n` migration
- Oxygen imports transformation: `@shopify/remix-oxygen` → `@shopify/hydrogen/oxygen`
- Virtual module path updates: `virtual:remix/server-build` → `virtual:react-router/server-build`
- Response utility migrations: `json()` → `data()`, `defer()` → `data()`
- Automatic TypeScript module augmentation for custom context fields

#### Safety and Validation
- Pre-transformation prerequisite checking
- Post-transformation validation system
- File integrity verification
- Syntax validation for all transformations
- Error recovery with detailed reporting
- Support for mixed TypeScript/JavaScript codebases

#### Developer Experience
- Comprehensive test suite with 169 tests
- Edge case handling and fixtures
- JSDoc support for JavaScript files
- Automatic import consolidation and deduplication
- Error type annotations for catch blocks
- Detection of project language and structure

### Fixed
- Proper handling of type exports from Remix packages
- Correct transformation of nested context properties
- Preservation of custom context fields during migration
- Support for files with mixed import styles

### Security
- No modification of files outside project scope
- Validation of all file paths before transformation
- Safe handling of malformed input

## [0.1.0] - 2024-01-XX (Pre-release)

### Added
- Initial project structure
- Basic transformation framework
- Test infrastructure setup
- Documentation framework

---

## Migration Guide

### From 0.x to 1.0

This is the first stable release. To use this codemod:

1. Ensure you've run the official Remix to React Router migration first
2. Run the codemod: `npx codemod shopify/hydrogen-react-router-migration`
3. Follow the post-migration steps in the documentation

### Breaking Changes

None in this release as it's the initial stable version.

### Deprecations

None in this release.

## Roadmap

### Future Enhancements

- [ ] Interactive mode with prompts for ambiguous transformations
- [ ] Rollback capability to undo transformations
- [ ] Configuration file support for custom transformation rules
- [ ] Integration with Hydrogen CLI for seamless migration workflow
- [ ] Support for custom transformation plugins
- [ ] Performance optimization for large codebases
- [ ] Enhanced reporting with HTML output option

### Known Limitations

1. **Manual Vite Config Update Required**: The codemod doesn't automatically update Vite configuration to use the React Router plugin
2. **Type Generation**: Route types must be generated after migration by running `npm run typecheck`
3. **Complex Custom Context**: Very complex custom context patterns may require manual review
4. **Non-standard Project Structures**: Projects with non-standard directory structures may need manual adjustments

## Support

For issues, questions, or contributions:
- [GitHub Issues](https://github.com/Shopify/hydrogen/issues)
- [Hydrogen Documentation](https://shopify.dev/hydrogen)
- [Discord Community](https://discord.gg/shopifydevs)