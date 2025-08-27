# CI (Continuous Integration) Workflow

## Overview
The `ci.yml` workflow is the primary continuous integration pipeline that runs on all pull requests. It ensures code quality, type safety, formatting consistency, and test coverage before changes can be merged.

## Trigger Conditions
- **Event**: All pull requests
- **Automatic**: Runs on PR creation, updates, and synchronization

## Jobs Overview
The workflow runs 5 parallel jobs:
1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **TypeScript** - Type checking and build validation
4. **Unit Tests** - Test suite execution
5. **Validate Recipes** - Cookbook recipe validation

## Job Details

### 1. Job: lint (ESLint)
- **Purpose**: Enforces code quality and style rules
- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Concurrency**: `ci-lint-${{ github.ref }}`

#### Steps
1. Checkout repository
2. Setup Node.js (version from `.nvmrc`)
3. Install dependencies with `npm ci` and rebuild native modules
4. Run `npm run lint` to check all code

### 2. Job: format (Prettier)
- **Purpose**: Ensures consistent code formatting
- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Concurrency**: `ci-format-${{ github.ref }}`

#### Steps
1. Checkout repository
2. Setup Node.js
3. Install dependencies
4. Run `npm run format:check` to verify formatting

### 3. Job: typecheck (TypeScript)
- **Purpose**: Validates TypeScript types and builds all packages
- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Concurrency**: `ci-typecheck-${{ github.ref }}`

#### Steps
1. Checkout repository
2. Setup Node.js
3. Install dependencies
4. Build all packages, templates, and examples
   - Command: `SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK=false npm run build:all`
   - Note: Turbo cache is disabled due to intermittent deployment failures
5. Run TypeScript type checking: `npm run typecheck`
6. Verify CLI manifest is up-to-date
   - Ensures `oclif.manifest.json` is regenerated when CLI commands change
   - Fails if manifest is out of sync

### 4. Job: test (Unit Tests)
- **Purpose**: Runs the complete test suite
- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Concurrency**: `ci-test-${{ github.ref }}`

#### Steps
1. Checkout repository
2. Setup Node.js
3. Install dependencies
4. Build all packages (required for tests)
5. Run `npm run test` to execute all unit tests

### 5. Job: validate_recipes (Cookbook Validation)
- **Purpose**: Validates cookbook recipes and schema
- **Runs on**: `ubuntu-latest`
- **Timeout**: 15 minutes
- **Concurrency**: `ci-validate-recipes-${{ github.ref }}`

#### Steps
1. Checkout repository
2. Setup Node.js
3. Install main dependencies
4. Build packages: `npm run build:pkg`
5. Install cookbook dependencies
6. Validate recipe schema
   - Regenerates `recipe.schema.json`
   - Fails if schema changes are uncommitted
7. Validate all recipes: `npm run cookbook -- validate`

## Key Features

### Concurrency Control
- Each job has its own concurrency group
- In-progress runs are cancelled when new commits are pushed
- Prevents resource waste and speeds up feedback

### Dependency Caching
- Node modules are cached based on `package-lock.json`
- Speeds up subsequent runs
- Cache key pattern: `npm-[OS]-[node-version]-[lockfile-hash]`

### Environment Variables
- `SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK=false`: Disables lockfile checking during builds

### Build Requirements
- All packages must build successfully
- Templates and examples are included in the build
- CLI manifest must be regenerated when commands change

## Quality Gates
All jobs must pass for a PR to be mergeable:
- ✅ No ESLint errors or warnings
- ✅ Code is properly formatted with Prettier
- ✅ TypeScript compilation succeeds with no type errors
- ✅ All unit tests pass
- ✅ Cookbook recipes are valid
- ✅ CLI manifest is up-to-date

## Performance Optimizations
- Parallel job execution for faster feedback
- Dependency caching reduces install time
- Concurrency groups prevent duplicate runs
- 15-minute timeout prevents hanging jobs

## Developer Experience
- Clear job names with emoji indicators
- Fast feedback on code quality issues
- Comprehensive validation before merge
- Consistent development environment via `.nvmrc`