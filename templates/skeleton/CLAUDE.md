# CLAUDE.md - Skeleton Template

This file provides specific guidance for the Hydrogen skeleton template.

## GraphQL Fragment Management

### Critical: All Fragments Must Be Used

In this template, GraphQL fragments are defined in `app/lib/fragments.ts`. **Every fragment defined MUST be used in at least one query or mutation**, otherwise the application will throw runtime errors.

### Adding New Fragments

When adding a new fragment:
1. Define it in `app/lib/fragments.ts`
2. Immediately use it in at least one query/mutation
3. Run `npm run codegen` to update generated types
4. Commit both the fragment and generated files

### Removing Fragments

When removing a fragment:
1. First remove all usages of the fragment
2. Then remove the fragment definition
3. Run `npm run codegen` to update generated types
4. Commit all changes together

## Generated Files

The following files are automatically generated and should NEVER be edited manually:
- `storefrontapi.generated.d.ts` - Storefront API types
- `customer-accountapi.generated.d.ts` - Customer Account API types

To regenerate these files after modifying GraphQL operations:
```bash
npm run codegen
```

## Type Safety

## Development Workflow

1. **Before modifying GraphQL operations**: Understand which fragments are available
2. **After modifying GraphQL operations**: Run `npm run codegen`
3. **Before committing**: Ensure all generated files are included
4. **Before pushing**: Run `npm run graphql:validate` to check for issues

## Common Issues and Solutions

### Issue: "Fragment X was defined, but not used"
**Solution**: Either use the fragment in a query/mutation or remove it entirely

### Issue: "Generated files have uncommitted changes"
**Solution**: Run `npm run codegen` and commit the changes

### Issue: "Type X doesn't exist on Y"
**Solution**: Check the Storefront API documentation to ensure you're using the correct types in the correct context
