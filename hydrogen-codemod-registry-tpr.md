# Technical Product Requirement Document
## Hydrogen React Router 7.8.x Migration - Codemod Registry Solution

### Executive Summary
This document outlines the technical requirements for creating and hosting a Hydrogen-specific React Router 7.8.x migration codemod on Codemod.com's registry. The codemod will live within the Hydrogen repository itself, leveraging Codemod.com's infrastructure to provide a seamless migration experience without requiring users to install an npm package.

**Key Advantages**: 
- Codemod source lives in the Hydrogen repository for easier maintenance
- Users can run the codemod directly without installation via:
```bash
npx codemod shopify/hydrogen-react-router-migration
```

---

## Scope Comparison: Hydrogen Codemod vs Official Remix-to-React-Router Codemod

### Official Remix-to-React-Router Codemod Scope
**Repository**: [github.com/jrestall/react-router-codemods](https://github.com/jrestall/react-router-codemods/tree/main/packages/remix-to-react-router)

**What it handles:**
1. **Package & Import Migrations**
   - `@remix-run/react` → `react-router`
   - `@remix-run/server-runtime` → `react-router`  
   - `@remix-run/node`, `@remix-run/cloudflare`, etc. → `react-router`
   - `react-router-dom` → `react-router`
   - Removes Remix-specific packages from package.json

2. **Component Renames**
   - `RemixServer` → `ServerRouter`
   - `RemixBrowser` → `HydratedRouter`

3. **Context Renames**
   - `remixContext` → `reactRouterContext`

4. **Virtual Module Paths**
   - `virtual:remix/server-build` → `virtual:react-router/server-build`

5. **Config Files**
   - Updates vite.config.ts plugin names
   - Updates package.json scripts (basic Remix → React Router commands)
   - Updates tsconfig.json compiler types

6. **Basic Type Imports**
   - Moves types from Remix packages to react-router

### Hydrogen-Specific Codemod Scope
**What the official codemod DOESN'T handle, but Hydrogen needs:**

1. **Route Type System** ⭐ (Unique to Hydrogen skeleton)
   ```typescript
   // Adds file-based Route type imports
   import type {Route} from './+types/products.$handle';
   
   // Converts function types
   LoaderFunctionArgs → Route.LoaderArgs
   ActionFunctionArgs → Route.ActionArgs
   MetaFunction → Route.MetaFunction
   ```

2. **Hydrogen Context API** ⭐ (Hydrogen-specific pattern)
   ```typescript
   createAppLoadContext() → createHydrogenRouterContext()
   AppLoadContext → HydrogenRouterContextProvider
   
   // Migrates custom context properties to additionalContext pattern
   // Adds TypeScript augmentation for custom context
   ```

3. **Hydrogen/Oxygen Imports** ⭐ (Shopify-specific package)
   ```typescript
   import {createRequestHandler} from '@shopify/remix-oxygen'
   → 
   import {createRequestHandler} from '@shopify/hydrogen/oxygen'
   ```

4. **Error Type Annotations** (Hydrogen convention)
   ```typescript
   .catch((error) => ...) → .catch((error: Error) => ...)
   ```

5. **Customer Account i18n Access** ⭐ (Hydrogen-specific API)
   ```typescript
   context.storefront.i18n.language → context.customerAccount.i18n.language
   ```

6. **React Router Config with Hydrogen Preset** ⭐
   ```typescript
   // Creates Hydrogen-optimized config
   import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
   export default {
     presets: [hydrogenPreset()],
   } satisfies Config;
   ```

7. **Package.json Script Updates** (Hydrogen-specific commands)
   ```json
   "typecheck": "react-router typegen && tsc --noEmit",
   "codegen": "shopify hydrogen codegen && react-router typegen"
   ```

8. **Environment Type References** (Hydrogen-specific types)
   ```typescript
   /// <reference types="@shopify/hydrogen/react-router-types" />
   ```

### Key Differences Summary

| Aspect | Official Codemod | Hydrogen Codemod |
|--------|-----------------|-------------------|
| **Target** | Any Remix app | Hydrogen apps specifically |
| **Packages** | Standard Remix packages | Shopify/Hydrogen packages |
| **Type System** | Basic type migration | Route-based type system with auto-generation |
| **Context** | Simple rename | Complex context pattern transformation |
| **Config** | Basic React Router config | Hydrogen-optimized preset |
| **Assumptions** | Generic Remix patterns | Hydrogen skeleton patterns |

### Why Two Separate Codemods?

1. **Separation of Concerns**: Official codemod handles generic Remix→RR migrations, Hydrogen handles framework-specific patterns
2. **Maintenance**: Official codemod maintained by React Router team, Hydrogen codemod by Shopify
3. **Flexibility**: Users can run official codemod on any Remix app, then add Hydrogen-specific migrations if needed
4. **Precision**: Each codemod focuses on what it knows best, reducing false positives

The Hydrogen codemod is essentially a "finishing touch" that handles all the Shopify/Hydrogen-specific patterns that the official codemod has no knowledge of.

---

## 1. Solution Architecture

### 1.1 Repository Strategy
The codemod will live within the main Hydrogen repository, utilizing GitHub Actions to automatically publish to Codemod.com's registry when changes are made.

**Repository**: `shopify/hydrogen` (existing repository)
**Location**: `/codemods/hydrogen-react-router-migration/`

### 1.2 Execution Flow
```mermaid
graph LR
    A[User runs npx codemod] --> B[Codemod Registry]
    B --> C[Download & Execute]
    C --> D[Check Prerequisites]
    D --> E[Run Transformations]
    E --> F[Generate Report]
```

### 1.3 Two-Stage Migration Process
1. **Stage 1**: User runs official Remix to React Router codemod
2. **Stage 2**: User runs Hydrogen-specific codemod

---

## 2. Repository Structure

The codemod will be integrated into the existing Hydrogen monorepo structure:

```
shopify/hydrogen/
├── packages/
│   ├── hydrogen/
│   ├── hydrogen-react/
│   ├── cli/
│   └── ...
├── templates/
│   └── skeleton/
├── codemods/                                      # New directory
│   └── hydrogen-react-router-migration/          # Our Hydrogen-specific codemod
│       ├── .codemodrc.json                       # Codemod configuration
│       ├── README.md                             # User documentation
│       ├── package.json                          # Local dependencies
│       ├── src/
│       │   ├── index.ts                          # Main entry point
│       │   ├── transformations/
│       │   │   ├── route-types.ts                # Route type migrations
│       │   │   ├── context-api.ts                # Context migrations
│       │   │   ├── imports.ts                    # Import updates
│       │   │   └── config-files.ts               # Config file updates
│       │   ├── detectors/
│       │   │   ├── version.ts                    # Version detection
│       │   │   └── prerequisites.ts              # Check if official codemod ran
│       │   └── utils/
│       │       ├── ast-helpers.ts                # AST manipulation utilities
│       │       └── file-helpers.ts               # File system utilities
│       ├── test/
│       │   └── transform.test.ts                 # Transformation tests
│       └── __testfixtures__/
│           ├── route-types.input.tsx
│           ├── route-types.output.tsx
│           ├── context-api.input.ts
│           └── context-api.output.ts
└── .github/
    └── workflows/
        ├── ci.yml                                 # Existing CI
        └── publish-codemod.yml                   # New workflow for codemod publishing
```

---

## 3. Codemod Configuration

### 3.1 .codemodrc.json
```json
{
  "$schema": "https://codemod.com/schema/codemodrc.json",
  "name": "shopify/hydrogen-react-router-migration",
  "version": "1.0.0",
  "private": false,
  "engine": "jscodeshift",
  "meta": {
    "tags": ["hydrogen", "react-router", "migration", "shopify"],
    "description": "Migrate Hydrogen-specific patterns to React Router 7.8.x",
    "git": "https://github.com/shopify/hydrogen/tree/main/codemods/hydrogen-react-router-migration"
  },
  "applicability": {
    "from": [
      ["@shopify/hydrogen", ">=2025.4.0 <2025.7.0"],
      ["react-router", ">=7.6.0 <7.8.0"]
    ],
    "to": [
      ["@shopify/hydrogen", "2025.7.0"],
      ["react-router", "7.8.2"]
    ]
  },
  "include": ["**/*.{ts,tsx,js,jsx}"],
  "exclude": ["**/node_modules/**", "**/dist/**", "**/.turbo/**"],
  "preCommands": [
    "echo 'Checking prerequisites...'",
    "node ./src/detectors/check-prerequisites.js"
  ],
  "postCommands": [
    "echo 'Running type generation...'",
    "npx react-router typegen"
  ]
}
```

---

## 4. Core Implementation

### 4.1 Main Entry Point (index.ts)
```typescript
import type { FileInfo, API, Options } from 'jscodeshift';
import { checkPrerequisites } from './detectors/prerequisites';
import { transformRouteTypes } from './transformations/route-types';
import { transformContextAPI } from './transformations/context-api';
import { transformImports } from './transformations/imports';
import { updateConfigFiles } from './transformations/config-files';

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
): string | undefined {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  // Skip if file shouldn't be transformed
  if (shouldSkipFile(fileInfo.path)) {
    return undefined;
  }
  
  let hasChanges = false;
  
  // Apply transformations in order
  hasChanges = transformRouteTypes(j, root, fileInfo.path) || hasChanges;
  hasChanges = transformContextAPI(j, root, fileInfo.path) || hasChanges;
  hasChanges = transformImports(j, root) || hasChanges;
  
  // Handle special files
  if (fileInfo.path.includes('lib/context')) {
    hasChanges = transformContextCreation(j, root) || hasChanges;
  }
  
  if (hasChanges) {
    return root.toSource({ quote: 'single' });
  }
  
  return undefined;
}

function shouldSkipFile(path: string): boolean {
  return path.includes('node_modules') || 
         path.includes('.d.ts') ||
         !path.match(/\.(tsx?|jsx?)$/);
}
```

### 4.2 Route Type Transformation
```typescript
// transformations/route-types.ts
import type { Collection, JSCodeshift } from 'jscodeshift';
import path from 'path';

export function transformRouteTypes(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  let hasChanges = false;
  
  // Extract route name from file path
  const routeName = extractRouteName(filePath);
  if (!routeName) return false;
  
  // Check if file has loader, action, or meta exports
  const hasRouteExports = 
    root.find(j.FunctionDeclaration, { id: { name: 'loader' } }).length > 0 ||
    root.find(j.FunctionDeclaration, { id: { name: 'action' } }).length > 0 ||
    root.find(j.VariableDeclaration).filter(p => {
      return p.value.declarations.some(d => 
        d.id.type === 'Identifier' && d.id.name === 'meta'
      );
    }).length > 0;
  
  if (!hasRouteExports) return false;
  
  // Add Route type import if not present
  const hasRouteImport = root.find(j.ImportDeclaration, {
    source: { value: `./+types/${routeName}` }
  }).length > 0;
  
  if (!hasRouteImport) {
    const routeImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('Route'))],
      j.literal(`./+types/${routeName}`),
      'type'
    );
    
    // Insert after last import
    const lastImport = root.find(j.ImportDeclaration).at(-1);
    if (lastImport.length > 0) {
      lastImport.insertAfter(routeImport);
    } else {
      root.get().node.program.body.unshift(routeImport);
    }
    hasChanges = true;
  }
  
  // Transform LoaderFunctionArgs to Route.LoaderArgs
  root.find(j.TSTypeReference, {
    typeName: { name: 'LoaderFunctionArgs' }
  }).forEach(path => {
    j(path).replaceWith(
      j.tsTypeReference(
        j.tsQualifiedName(
          j.identifier('Route'),
          j.identifier('LoaderArgs')
        )
      )
    );
    hasChanges = true;
  });
  
  // Transform ActionFunctionArgs to Route.ActionArgs
  root.find(j.TSTypeReference, {
    typeName: { name: 'ActionFunctionArgs' }
  }).forEach(path => {
    j(path).replaceWith(
      j.tsTypeReference(
        j.tsQualifiedName(
          j.identifier('Route'),
          j.identifier('ActionArgs')
        )
      )
    );
    hasChanges = true;
  });
  
  // Transform MetaFunction
  root.find(j.VariableDeclarator, {
    id: { name: 'meta' }
  }).forEach(path => {
    const typeAnnotation = path.value.id.typeAnnotation;
    if (typeAnnotation?.typeAnnotation?.typeName?.name === 'MetaFunction') {
      path.value.id.typeAnnotation = j.tsTypeAnnotation(
        j.tsTypeReference(
          j.tsQualifiedName(
            j.identifier('Route'),
            j.identifier('MetaFunction')
          )
        )
      );
      hasChanges = true;
    }
  });
  
  return hasChanges;
}

function extractRouteName(filePath: string): string | null {
  const match = filePath.match(/routes\/(.+)\.(tsx?|jsx?)$/);
  if (!match) return null;
  
  // Convert file name to route type name
  // e.g., products.$handle.tsx -> products.$handle
  // e.g., [sitemap.xml].tsx -> [sitemap.xml]
  return match[1];
}
```

### 4.3 Context API Transformation
```typescript
// transformations/context-api.ts
export function transformContextCreation(
  j: JSCodeshift,
  root: Collection
): boolean {
  let hasChanges = false;
  
  // Find createAppLoadContext function
  const contextFunction = root.find(j.FunctionDeclaration, {
    id: { name: 'createAppLoadContext' }
  });
  
  if (contextFunction.length === 0) return false;
  
  contextFunction.forEach(path => {
    const func = path.value;
    
    // Rename function
    if (func.id) {
      func.id.name = 'createHydrogenRouterContext';
      hasChanges = true;
    }
    
    // Find return statement with spread
    const returnStatements = j(path).find(j.ReturnStatement);
    returnStatements.forEach(returnPath => {
      const returnArg = returnPath.value.argument;
      
      if (returnArg?.type === 'ObjectExpression') {
        const hasSpread = returnArg.properties.some(
          p => p.type === 'SpreadElement' && 
               p.argument.name === 'hydrogenContext'
        );
        
        if (hasSpread) {
          // Extract additional properties
          const additionalProps = returnArg.properties.filter(
            p => p.type !== 'SpreadElement'
          );
          
          if (additionalProps.length > 0) {
            // Create additionalContext const
            const additionalContext = j.variableDeclaration('const', [
              j.variableDeclarator(
                j.identifier('additionalContext'),
                j.tsAsExpression(
                  j.objectExpression(additionalProps),
                  j.tsTypeReference(j.identifier('const'))
                )
              )
            ]);
            
            // Insert before function
            j(path).insertBefore(additionalContext);
            
            // Add type augmentation
            const typeAugmentation = createTypeAugmentation(j);
            j(path).insertBefore(typeAugmentation);
            
            // Update return to just return hydrogenContext
            returnPath.value.argument = j.identifier('hydrogenContext');
            
            // Update createHydrogenContext call to include additionalContext
            updateHydrogenContextCall(j, path, 'additionalContext');
            
            hasChanges = true;
          }
        }
      }
    });
  });
  
  // Update all references to createAppLoadContext
  root.find(j.Identifier, { name: 'createAppLoadContext' })
    .forEach(path => {
      path.value.name = 'createHydrogenRouterContext';
      hasChanges = true;
    });
  
  return hasChanges;
}
```

### 4.4 Prerequisites Check
```typescript
// detectors/prerequisites.ts
import fs from 'fs';
import path from 'path';

export function checkPrerequisites(projectRoot: string): {
  ready: boolean;
  message?: string;
} {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return {
      ready: false,
      message: 'No package.json found. Are you in a Hydrogen project?'
    };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check if Remix dependencies still exist
  if (deps['@remix-run/react'] || deps['@remix-run/dev']) {
    return {
      ready: false,
      message: `
❌ Remix dependencies detected!

Please run the official Remix to React Router codemod first:
npx codemod remix/2/react-router/upgrade

Then run this Hydrogen-specific codemod:
npx codemod shopify/hydrogen-react-router-migration
`
    };
  }
  
  // Check if React Router 7.8 is already installed
  if (deps['react-router']?.includes('7.8')) {
    return {
      ready: false,
      message: 'Already on React Router 7.8.x - no migration needed!'
    };
  }
  
  // Check for Hydrogen
  if (!deps['@shopify/hydrogen']) {
    return {
      ready: false,
      message: 'No @shopify/hydrogen dependency found. Is this a Hydrogen project?'
    };
  }
  
  return { ready: true };
}
```

---

## 5. Testing Strategy

### 5.1 Test Fixtures
Each transformation should have comprehensive test fixtures:

```typescript
// __testfixtures__/route-types.input.tsx
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader(args: LoaderFunctionArgs) {
  return {};
}

// __testfixtures__/route-types.output.tsx  
import {useLoaderData} from 'react-router';
import type {Route} from './+types/route-types';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader(args: Route.LoaderArgs) {
  return {};
}
```

### 5.2 Test Implementation
```typescript
// test/transform.test.ts
import { defineTest } from 'jscodeshift/dist/testUtils';

describe('Hydrogen RR 7.8 Migration', () => {
  defineTest(
    __dirname,
    'hydrogen-react-router-migration',
    {},
    'route-types',
    'Route type transformations'
  );
  
  defineTest(
    __dirname,
    'hydrogen-react-router-migration',
    {},
    'context-api',
    'Context API transformations'
  );
});
```

---

## 6. CI/CD and Publishing

### 6.1 GitHub Actions Workflow
Create a dedicated workflow for publishing the codemod from the Hydrogen repository:

```yaml
# .github/workflows/publish-codemod.yml
name: Publish Hydrogen Codemod to Registry

on:
  push:
    branches: [main]
    paths:
      - 'codemods/hydrogen-react-router-migration/**'
      - '.github/workflows/publish-codemod.yml'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm ci
      
      - name: Run tests
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm test
      
      - name: Install Codemod CLI
        run: npm install -g @codemod.com/cli
      
      - name: Authenticate with Codemod Registry
        env:
          CODEMOD_API_KEY: ${{ secrets.CODEMOD_API_KEY }}
        run: codemod auth $CODEMOD_API_KEY
      
      - name: Publish Codemod
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npx codemod publish .
```

### 6.2 Setup Steps
1. Create codemod directory in Hydrogen repository: `codemods/hydrogen-react-router-migration/`
2. Generate Codemod API key: `npx codemod login`
3. Add `CODEMOD_API_KEY` to Hydrogen repository secrets
4. Develop and test codemod locally
5. Push changes to main branch for automatic publication

---

## 7. User Experience

### 7.1 Installation-Free Execution
Users run the codemod without any installation:
```bash
# Step 1: Run official codemod (if coming from Remix)
npx codemod remix/2/react-router/upgrade

# Step 2: Run Hydrogen-specific migrations
npx codemod shopify/hydrogen-react-router-migration
```

### 7.2 Clear Migration Flow
```
═══════════════════════════════════════════════════════════════
  Hydrogen React Router 7.8.x Migration
═══════════════════════════════════════════════════════════════

✅ Prerequisites Check:
  • React Router detected ✓
  • No Remix dependencies ✓
  • Hydrogen 2025.5.x detected ✓

🚀 Starting migration...

  Scanning files... 89 files found
  
  Applying transformations:
  • Route types .............. 42 files ✓
  • Context API .............. 1 file ✓
  • Imports .................. 15 files ✓
  • Config files ............. 2 files ✓
  • Package.json ............. 1 file ✓
  
✨ Migration complete!

📝 Next steps:
  1. Run 'npm install' to update dependencies
  2. Run 'npm run typecheck' to generate Route types
  3. Test your application
  
Need help? Visit: https://github.com/shopify/hydrogen/tree/main/codemods
═══════════════════════════════════════════════════════════════
```

### 7.3 Error Handling
```typescript
export function handleError(error: Error, file?: string) {
  if (error.message.includes('Remix dependencies detected')) {
    console.error(chalk.red(`
❌ Cannot proceed with migration

${error.message}

Please complete the prerequisite steps before running this codemod.
`));
    process.exit(1);
  }
  
  if (file) {
    console.warn(chalk.yellow(`
⚠️  Failed to transform ${file}
   ${error.message}
   This file may need manual migration.
`));
    // Continue with other files
  }
}
```

---

## 8. Documentation

### 8.1 Codemod Directory README
Located at `codemods/README.md`:
```markdown
# Hydrogen Codemods

Official codemods for Shopify Hydrogen framework migrations.

## Available Codemods

### hydrogen-react-router-migration
Migrates Hydrogen-specific patterns to React Router 7.8.x

**Prerequisites**: 
- Must run official Remix to React Router codemod first (if on Remix)
- Hydrogen 2025.4.x - 2025.6.x

**Usage**:
```bash
npx codemod shopify/hydrogen-react-router-migration
```

## Development

To work on codemods locally:

```bash
cd codemods/hydrogen-react-router-migration
npm install
npm test
```

## Contributing
See main repository CONTRIBUTING.md for guidelines.
```

### 8.2 Codemod-Specific README
Located at `codemods/hydrogen-react-router-migration/README.md`:
```markdown
# Hydrogen React Router 7.8.x Migration

This codemod handles Hydrogen-specific migrations to React Router 7.8.x that are not covered by the official Remix to React Router codemod.

## What This Migrates

✅ **Route Type System**
- Adds `Route` type imports
- Converts `LoaderFunctionArgs` → `Route.LoaderArgs`
- Converts `ActionFunctionArgs` → `Route.ActionArgs`
- Converts `MetaFunction` → `Route.MetaFunction`

✅ **Context API**
- `createAppLoadContext` → `createHydrogenRouterContext`
- Migrates custom context properties to `additionalContext` pattern
- Updates context type references

✅ **Imports**
- `@shopify/remix-oxygen` → `@shopify/hydrogen/oxygen`
- Adds error type annotations

✅ **Configuration**
- Creates `react-router.config.ts` with Hydrogen preset
- Updates package.json scripts
- Updates env.d.ts type references

## Prerequisites

If migrating from Remix (Hydrogen 2025.4.x), run first:
```bash
npx codemod remix/2/react-router/upgrade
```

## Manual Steps After Migration

1. Run `npm install`
2. Run `npm run typecheck`
3. Review and test your application
```

---

## 9. Advantages of Codemod Registry + Monorepo Approach

### 9.1 Benefits
1. **No Installation Required**: Users run via npx without installing packages
2. **Automatic Updates**: Push to main automatically publishes updates
3. **Version Synchronization**: Codemod updates alongside Hydrogen releases
4. **Single Repository**: All Hydrogen code in one place
5. **Discovery**: Listed in public Codemod registry
6. **Analytics**: Track usage and success rates through platform
7. **CI/CD Integration**: Leverages existing Hydrogen infrastructure
8. **Easier Maintenance**: Codemod can be updated in same PR as skeleton changes

### 9.2 Comparison of Approaches
| Aspect | Codemod Registry (Monorepo) | NPM Package | Separate Repository |
|--------|------------------------------|-------------|-------------------|
| Installation | None (npx) | Required | None (npx) |
| Publishing | Automatic | Manual | Automatic |
| Discovery | Registry UI | NPM search | Registry UI |
| Analytics | Built-in | None | Built-in |
| Maintenance | Easiest | Complex | Moderate |
| Version Sync | Perfect | Manual | Manual |
| User Experience | Seamless | Extra steps | Seamless |

---

## 10. Implementation Timeline

### Week 1: Repository Setup
- Create repository from template
- Set up GitHub Actions
- Configure Codemod API key
- Basic project structure

### Week 2: Core Transformations
- Route type system
- Context API migrations
- Import updates

### Week 3: Additional Features
- Config file generation
- Package.json updates
- Prerequisites checking

### Week 4: Testing & Polish
- Comprehensive test fixtures
- Error handling
- Documentation

### Week 5: Release
- Publish to Codemod Registry
- Announce to community
- Monitor usage

---

## 11. Success Metrics

### 11.1 Technical Metrics
- **Execution Success Rate**: >95% without errors
- **Transformation Accuracy**: 100% valid TypeScript output
- **Performance**: <10 seconds for typical projects
- **Coverage**: All Hydrogen skeleton patterns migrated

### 11.2 Usage Metrics (via Codemod Platform)
- Number of executions
- Success/failure rates
- Common error patterns
- User feedback

---

## Summary

By leveraging Codemod.com's registry and infrastructure while hosting the codemod within the Hydrogen repository, we achieve the best of both worlds: centralized maintenance and seamless distribution. The solution requires no npm installation, automatically publishes updates, and integrates perfectly with the official Remix to React Router codemod.

The monorepo approach ensures that the codemod stays in sync with Hydrogen skeleton changes, allowing updates to be made in the same PR. The automatic publishing via GitHub Actions ensures that fixes and improvements are immediately available to users through the Codemod Registry.

This approach provides:
- **Optimal developer experience** with installation-free execution
- **Minimal maintenance overhead** by keeping everything in one repository
- **Perfect version synchronization** between Hydrogen and the codemod
- **Maximum discoverability** through the Codemod Registry
- **Seamless integration** with existing Hydrogen CI/CD infrastructure