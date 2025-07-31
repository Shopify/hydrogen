# Hydrogen CLI Dependency Chain and Release Process

*Source: @rheese.burgess@shopify.com*

## Overview

This document explains the complex dependency relationships between Shopify's Hydrogen CLI packages and the multi-step release process required to keep everything in sync.

## Dependency Chain

The dependency chain works as follows:

### 1. Skeleton Dependencies
- The skeleton has a dependency on the main `@shopify/cli` package
- Provides users with the CLI's build and deploy scripts
- Also depends on the latest version of Hydrogen

### 2. CLI Package Dependencies
- The `@shopify/cli` package has a dependency on `@shopify/cli-hydrogen` package
- This is Hydrogen's `/packages/cli` module
- Allows pulling in Hydrogen's CLI commands

### 3. CLI-Hydrogen Dependencies
- `@shopify/cli-hydrogen` package depends on `@shopify/cli-kit` to build CLI commands
- **Issue**: `cli-kit` is part of the main cli repo and released together
- This creates a situation where updating `@shopify/cli` to use newer `@shopify/cli-hydrogen` immediately makes our repo have an outdated version of `@shopify/cli-kit`

### 4. Skeleton Code Integration
- `@shopify/cli-hydrogen` directly pulls in the skeleton code
- This is needed to generate new Hydrogen projects

### 5. Project Creation Process
- Users create projects with: `npm create @shopify/hydrogen@latest`
- `npm create <scope>/<package>` is an alias for `npm init <scope>/create-<package>`
- This runs the `@shopify/create-hydrogen` package's bin file
- Which directly uses the `@shopify/cli-hydrogen` code

## Release Process Complexity

To release a fix to the Hydrogen CLI, the following dance is required:

### Step 1: Initial CLI Release
- Release `@shopify/cli-hydrogen`

### Step 2: Update Main CLI (Dual PR Process)
- Update `@shopify/cli` to pull in the latest version of `@shopify/cli-hydrogen`
- **Requires 2 separate PRs:**
  - A patch PR to go out immediately
  - A regular PR to go out with the next scheduled release

### Step 3: Update Skeleton
- Update the skeleton to pull in the latest version of `@shopify/cli`

### Step 4: Final Release
- Release another version of `@shopify/cli-hydrogen` and `@shopify/create-hydrogen`
- This pulls in the newer skeleton

## Consequences of Incomplete Process

If all steps are not followed correctly:
- Generating a new Hydrogen project results in a skeleton file that uses:
  - ✅ Latest version of Hydrogen
  - ❌ Older version of the CLI

## Potential Issues

1. **Version Mismatch**: The `cli-kit` dependency issue creates immediate version mismatches
2. **Complex Release Coordination**: Requires precise coordination across multiple packages
3. **Multi-Step Dependencies**: Changes propagate through 4+ packages before reaching end users
4. **Risk of Inconsistent State**: Missing any step leaves the system in an inconsistent state

## Suggested Improvements

*Note: These are potential areas for improvement, not implemented solutions*

- Consider flattening the dependency chain
- Investigate bundling related packages together
- Implement automated release coordination
- Add validation to ensure all packages are properly synchronized
