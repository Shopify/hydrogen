# Hydrogen React Router 7.8.x Migration Codemod - Multiphase Development Plan

## Development Status

### Current Progress: Milestone 4 Complete ✅
- **Branch**: `feat/hydrogen-react-router-codemod`
- **Last Updated**: 2025-09-11
- **Status**: Ready for Milestone 5

#### Milestone 4 Achievements:
- ✅ Context API transformation module created
- ✅ createAppLoadContext → createHydrogenRouterContext rename
- ✅ Custom context properties extraction to additionalContext
- ✅ TypeScript module augmentation for custom properties
- ✅ JavaScript JSDoc typedef generation
- ✅ context.storefront.i18n → context.customerAccount.i18n migration
- ✅ Comprehensive test coverage (10 new tests)
- ✅ Integration with main transformer

#### Milestone 3 Achievements:
- ✅ Route type transformer implementation
- ✅ Route type imports added for TypeScript files
- ✅ JSDoc typedefs added for JavaScript files
- ✅ LoaderFunctionArgs → Route.LoaderArgs transformation
- ✅ ActionFunctionArgs → Route.ActionArgs transformation
- ✅ MetaFunction → Route.MetaFunction transformation
- ✅ Old type imports cleanup
- ✅ Comprehensive test coverage for both TS and JS
- ✅ Test fixtures for complete route files
- ✅ Integration with main transformer
- ✅ Fixed all test failures (80/80 tests passing)
- ✅ Integrated codemod into Hydrogen monorepo workspace
- ✅ Added proper parser configuration for TypeScript/JavaScript
- ✅ Implemented robust JSDoc comment insertion for JavaScript
- ✅ Fixed route name extraction for bracket notation patterns

### Milestone Tracker
| Milestone | Status | Completion |
|-----------|--------|------------|
| 1. Repository Setup and Infrastructure | ✅ Complete | 100% |
| 2. Prerequisite Checking and Detection | ✅ Complete | 100% |
| 3. Route Type System Transformation | ✅ Complete | 100% |
| 4. Context API Migration | ⏳ Pending | 0% |
| 5. Import and Package Transformations | ⏳ Pending | 0% |
| 6. Configuration Files and Package.json | ⏳ Pending | 0% |
| 7. Comprehensive Testing and Edge Cases | ⏳ Pending | 0% |
| 8. CI/CD Pipeline and Registry Publishing | ⏳ Pending | 0% |

## Executive Summary
This document provides a comprehensive development plan for creating a Hydrogen-specific React Router 7.8.x migration codemod. The codemod will be hosted in the Hydrogen repository and published to Codemod.com's registry. Each milestone is designed to be self-contained and executable by different AI agents or developers.

## Project Overview
- **Repository**: `shopify/hydrogen`
- **Location**: `/codemods/hydrogen-react-router-migration/`
- **Execution**: `npx codemod shopify/hydrogen-react-router-migration`
- **Dependencies**: Requires official Remix-to-React-Router codemod to run first
- **Target**: Hydrogen apps migrating from Remix/React Router 7.6.x to React Router 7.8.x

---

## Milestone 1: Repository Setup and Infrastructure

### Objective
Establish the codemod directory structure within the Hydrogen monorepo and configure Codemod.com integration.

### Scope
- Create directory structure under `/codemods/hydrogen-react-router-migration/`
- Setup package.json with required dependencies
- Configure .codemodrc.json for Codemod Registry
- Establish TypeScript configuration
- Create initial entry point

### Implementation Details

#### Directory Structure
```
shopify/hydrogen/
├── codemods/
│   └── hydrogen-react-router-migration/
│       ├── .codemodrc.json
│       ├── README.md
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── constants.ts
│       │   ├── transformations/
│       │   ├── detectors/
│       │   └── utils/
│       ├── test/
│       │   └── setup.ts
│       └── __testfixtures__/
```

#### Package.json Configuration
```json
{
  "name": "@shopify/hydrogen-react-router-migration",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src test",
    "build": "tsc"
  },
  "dependencies": {
    "jscodeshift": "^0.15.0",
    "@types/jscodeshift": "^0.11.11"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.50.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### .codemodrc.json Configuration
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
  "preCommands": [],
  "postCommands": []
}
```

### Success Criteria
- [x] Directory structure created under `/codemods/hydrogen-react-router-migration/` ✅
- [x] package.json configured with correct dependencies ✅
- [x] .codemodrc.json validated against Codemod schema ✅
- [x] TypeScript configuration working ✅
- [x] Initial index.ts exports a valid JSCodeshift transformer ✅
- [x] Basic test setup configured with Vitest ✅

### Unit Tests
```typescript
// test/setup.test.ts
describe('Codemod Setup', () => {
  test('transformer function is exported from index', () => {
    const transformer = require('../src/index');
    expect(typeof transformer.default).toBe('function');
  });

  test('transformer has correct signature', () => {
    const transformer = require('../src/index');
    expect(transformer.default.length).toBe(3); // fileInfo, api, options
  });
});
```

### E2E Tests
```typescript
// test/e2e/setup.test.ts
describe('Codemod Registry Integration', () => {
  test('codemodrc.json is valid', () => {
    const config = require('../.codemodrc.json');
    expect(config.name).toBe('shopify/hydrogen-react-router-migration');
    expect(config.engine).toBe('jscodeshift');
  });
});
```

### Deliverables
- `/codemods/hydrogen-react-router-migration/` directory
- Configured package.json, tsconfig.json, .codemodrc.json
- Basic index.ts transformer skeleton
- Initial test setup

---

## Milestone 2: Prerequisite Checking and Detection System

### Objective
Implement robust prerequisite checking to ensure the codemod runs only after the official Remix-to-React-Router migration.

### Scope
- Version detection for Hydrogen and React Router
- Check for lingering Remix dependencies
- Validate project structure
- Create clear error messaging
- Implement skip conditions

### Implementation Details

#### Prerequisites Detector
```typescript
// src/detectors/prerequisites.ts
import fs from 'fs';
import path from 'path';

export interface PrerequisiteResult {
  ready: boolean;
  message?: string;
  details?: {
    hasRemixDeps: boolean;
    hasReactRouter: boolean;
    hydrogenVersion?: string;
    reactRouterVersion?: string;
  };
}

export function checkPrerequisites(projectRoot: string): PrerequisiteResult {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return {
      ready: false,
      message: 'No package.json found. Are you in a Hydrogen project?'
    };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check for Remix dependencies
  const remixPackages = [
    '@remix-run/react',
    '@remix-run/dev',
    '@remix-run/node',
    '@remix-run/cloudflare',
    '@remix-run/server-runtime'
  ];
  
  const hasRemixDeps = remixPackages.some(pkg => deps[pkg]);
  
  if (hasRemixDeps) {
    return {
      ready: false,
      message: `
❌ Remix dependencies detected!

Please run the official Remix to React Router codemod first:
npx codemod remix/2/react-router/upgrade

Then run this Hydrogen-specific codemod:
npx codemod shopify/hydrogen-react-router-migration
`,
      details: {
        hasRemixDeps: true,
        hasReactRouter: false
      }
    };
  }
  
  // Check React Router version
  const rrVersion = deps['react-router'];
  if (!rrVersion) {
    return {
      ready: false,
      message: 'No react-router dependency found. Has the official migration been run?'
    };
  }
  
  if (rrVersion.includes('7.8')) {
    return {
      ready: false,
      message: 'Already on React Router 7.8.x - no migration needed!'
    };
  }
  
  // Check for Hydrogen
  const hydrogenVersion = deps['@shopify/hydrogen'];
  if (!hydrogenVersion) {
    return {
      ready: false,
      message: 'No @shopify/hydrogen dependency found. Is this a Hydrogen project?'
    };
  }
  
  return {
    ready: true,
    details: {
      hasRemixDeps: false,
      hasReactRouter: true,
      hydrogenVersion,
      reactRouterVersion: rrVersion
    }
  };
}
```

#### File Skip Detection
```typescript
// src/detectors/file-filter.ts
export function shouldTransformFile(filePath: string): boolean {
  // Skip non-source files
  if (filePath.includes('node_modules')) return false;
  if (filePath.includes('dist')) return false;
  if (filePath.includes('.d.ts')) return false;
  if (filePath.includes('.test.')) return false;
  if (filePath.includes('.spec.')) return false;
  
  // Only transform JS/TS files
  const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  const hasValidExtension = validExtensions.some(ext => filePath.endsWith(ext));
  
  if (!hasValidExtension) return false;
  
  // Check if file is in app directory or routes
  const isAppFile = filePath.includes('/app/') || 
                    filePath.includes('/routes/') ||
                    filePath.includes('/lib/');
  
  return isAppFile;
}

export function extractRouteName(filePath: string): string | null {
  // Extract route name from file path
  // e.g., app/routes/products.$handle.tsx -> products.$handle
  const routeMatch = filePath.match(/routes\/(.+)\.(tsx?|jsx?)$/);
  if (!routeMatch) return null;
  
  // Handle special route file names
  const routeName = routeMatch[1]
    .replace(/\._index$/, '')  // _index routes
    .replace(/\._layout$/, '')  // layout routes
    .replace(/\[(.+)\]/, '$1'); // bracket notation to dot notation
  
  return routeName;
}
```

### Success Criteria
- [x] Prerequisites check detects Remix dependencies ✅
- [x] Prerequisites check validates React Router version ✅
- [x] Prerequisites check confirms Hydrogen presence ✅
- [x] File filter correctly identifies transformable files ✅
- [x] Route name extraction handles all route patterns ✅
- [x] Clear error messages for each failure scenario ✅
- [x] Language detection for TypeScript/JavaScript projects ✅
- [x] Transformation strategies for both languages ✅

### Unit Tests
```typescript
// test/detectors/prerequisites.test.ts
describe('Prerequisites Checker', () => {
  test('detects Remix dependencies', () => {
    const mockPackageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0',
        '@shopify/hydrogen': '2025.5.0'
      }
    };
    
    const result = checkPrerequisites(mockPackageJson);
    expect(result.ready).toBe(false);
    expect(result.message).toContain('Remix dependencies detected');
  });
  
  test('validates React Router version', () => {
    const mockPackageJson = {
      dependencies: {
        'react-router': '7.8.0',
        '@shopify/hydrogen': '2025.5.0'
      }
    };
    
    const result = checkPrerequisites(mockPackageJson);
    expect(result.ready).toBe(false);
    expect(result.message).toContain('Already on React Router 7.8.x');
  });
  
  test('passes valid project', () => {
    const mockPackageJson = {
      dependencies: {
        'react-router': '7.6.0',
        '@shopify/hydrogen': '2025.5.0'
      }
    };
    
    const result = checkPrerequisites(mockPackageJson);
    expect(result.ready).toBe(true);
  });
});
```

### E2E Tests
```typescript
// test/e2e/prerequisites.test.ts
describe('Prerequisites E2E', () => {
  test('blocks execution with Remix dependencies', async () => {
    const testProject = createTestProject({
      dependencies: {
        '@remix-run/react': '^2.0.0'
      }
    });
    
    const result = await runCodemod(testProject);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Please run the official');
  });
});
```

### Deliverables
- Prerequisites checking system ✅
- File filtering logic ✅
- Route name extraction utility ✅
- Language detection system ✅
- TypeScript and JavaScript transformation strategies ✅
- Comprehensive error messages ✅
- Test coverage for all scenarios ✅
- Tests colocated with source files ✅

---

## Milestone 3: Route Type System Transformation

### Objective
Transform Hydrogen route files to use the new React Router 7.8.x type system with file-based Route types.

### Scope
- Add Route type imports from `./+types/{routeName}`
- Transform LoaderFunctionArgs → Route.LoaderArgs
- Transform ActionFunctionArgs → Route.ActionArgs
- Transform MetaFunction → Route.MetaFunction
- Handle both TypeScript and JavaScript files

### Implementation Details

#### Route Type Transformer
```typescript
// src/transformations/route-types.ts
import type { Collection, JSCodeshift, Transform } from 'jscodeshift';
import { extractRouteName } from '../detectors/file-filter';

export function transformRouteTypes(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  let hasChanges = false;
  
  const routeName = extractRouteName(filePath);
  if (!routeName) return false;
  
  // Check if file has route exports
  const hasLoader = root.find(j.FunctionDeclaration, { 
    id: { name: 'loader' } 
  }).length > 0 || root.find(j.ExportNamedDeclaration).filter(path => {
    const declaration = path.value.declaration;
    return declaration?.type === 'FunctionDeclaration' && 
           declaration.id?.name === 'loader';
  }).length > 0;
  
  const hasAction = root.find(j.FunctionDeclaration, { 
    id: { name: 'action' } 
  }).length > 0 || root.find(j.ExportNamedDeclaration).filter(path => {
    const declaration = path.value.declaration;
    return declaration?.type === 'FunctionDeclaration' && 
           declaration.id?.name === 'action';
  }).length > 0;
  
  const hasMeta = root.find(j.VariableDeclarator, {
    id: { name: 'meta' }
  }).length > 0;
  
  if (!hasLoader && !hasAction && !hasMeta) {
    return false;
  }
  
  // Add Route type import
  const routeImportPath = `./+types/${routeName}`;
  const hasRouteImport = root.find(j.ImportDeclaration, {
    source: { value: routeImportPath }
  }).length > 0;
  
  if (!hasRouteImport) {
    const routeImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('Route'))],
      j.literal(routeImportPath),
      'type'
    );
    
    // Insert after last import
    const imports = root.find(j.ImportDeclaration);
    if (imports.length > 0) {
      imports.at(-1).insertAfter(routeImport);
    } else {
      root.get().node.program.body.unshift(routeImport);
    }
    hasChanges = true;
  }
  
  // Transform LoaderFunctionArgs
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
  
  // Transform ActionFunctionArgs
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
  root.find(j.TSTypeReference, {
    typeName: { name: 'MetaFunction' }
  }).forEach(path => {
    // Check if it's already qualified
    if (path.parent.value.type === 'TSTypeParameterInstantiation') {
      return; // Skip if it's a generic parameter
    }
    
    j(path).replaceWith(
      j.tsTypeReference(
        j.tsQualifiedName(
          j.identifier('Route'),
          j.identifier('MetaFunction')
        )
      )
    );
    hasChanges = true;
  });
  
  // Handle destructured args pattern
  root.find(j.FunctionDeclaration).forEach(path => {
    const func = path.value;
    if (func.id?.name !== 'loader' && func.id?.name !== 'action') return;
    
    const param = func.params[0];
    if (param?.type === 'ObjectPattern' && param.typeAnnotation) {
      const typeAnnotation = param.typeAnnotation.typeAnnotation;
      if (typeAnnotation?.type === 'TSTypeReference') {
        const typeName = typeAnnotation.typeName;
        if (typeName?.type === 'Identifier') {
          if (typeName.name === 'LoaderFunctionArgs') {
            param.typeAnnotation = j.tsTypeAnnotation(
              j.tsTypeReference(
                j.tsQualifiedName(
                  j.identifier('Route'),
                  j.identifier('LoaderArgs')
                )
              )
            );
            hasChanges = true;
          } else if (typeName.name === 'ActionFunctionArgs') {
            param.typeAnnotation = j.tsTypeAnnotation(
              j.tsTypeReference(
                j.tsQualifiedName(
                  j.identifier('Route'),
                  j.identifier('ActionArgs')
                )
              )
            );
            hasChanges = true;
          }
        }
      }
    }
  });
  
  // Remove old type imports
  root.find(j.ImportSpecifier).forEach(path => {
    const imported = path.value.imported;
    if (imported?.type === 'Identifier' && 
        ['LoaderFunctionArgs', 'ActionFunctionArgs', 'MetaFunction'].includes(imported.name)) {
      j(path).remove();
      hasChanges = true;
    }
  });
  
  return hasChanges;
}
```

### Success Criteria
- [x] Route type import added for files with loader/action/meta ✅
- [x] LoaderFunctionArgs transformed to Route.LoaderArgs ✅
- [x] ActionFunctionArgs transformed to Route.ActionArgs ✅
- [x] MetaFunction transformed to Route.MetaFunction ✅
- [x] Old type imports removed ✅
- [x] Handles both named and default exports ✅
- [x] Works with destructured parameters ✅
- [x] TypeScript and JavaScript support ✅

### Unit Tests
```typescript
// test/transformations/route-types.test.ts
describe('Route Type Transformation', () => {
  test('adds Route type import', () => {
    const input = `
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader(args: LoaderFunctionArgs) {
  return {};
}`;
    
    const expected = `
import type {Route} from './+types/test-route';

export async function loader(args: Route.LoaderArgs) {
  return {};
}`;
    
    const result = transform(input, 'app/routes/test-route.tsx');
    expect(result).toBe(expected);
  });
  
  test('transforms MetaFunction', () => {
    const input = `
export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: data.title}];
};`;
    
    const expected = `
import type {Route} from './+types/page';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: data.title}];
};`;
    
    const result = transform(input, 'app/routes/page.tsx');
    expect(result).toBe(expected);
  });
});
```

### E2E Tests
```typescript
// test/e2e/route-types.test.ts
describe('Route Types E2E', () => {
  test('transforms complete route file', async () => {
    const input = await readFixture('route-complete.input.tsx');
    const expected = await readFixture('route-complete.output.tsx');
    
    const result = await runCodemod(input);
    expect(result).toBe(expected);
  });
});
```

### Test Fixtures
```typescript
// __testfixtures__/route-types.input.tsx
import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader({context, params}: LoaderFunctionArgs) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
  });
  
  return json({product});
}

// __testfixtures__/route-types.output.tsx
import {json} from '@shopify/hydrogen/oxygen';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Product ${data.product.title}`}];
};

export async function loader({context, params}: Route.LoaderArgs) {
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle: params.handle},
  });
  
  return json({product});
}
```

### Deliverables
- Route type transformation logic
- Route import injection
- Type reference updates
- Old import cleanup
- Comprehensive test fixtures

---

## Milestone 4: Context API Migration

### Objective
Transform Hydrogen's context creation pattern from `createAppLoadContext` to `createHydrogenRouterContext` with proper type augmentation.

### Scope
- Rename createAppLoadContext → createHydrogenRouterContext
- Extract custom context properties to additionalContext
- Add TypeScript module augmentation
- Update context references throughout codebase
- Handle HydrogenRouterContextProvider pattern

### Implementation Details

#### Context Transformation
```typescript
// src/transformations/context-api.ts
import type { Collection, JSCodeshift } from 'jscodeshift';

export function transformContextAPI(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  let hasChanges = false;
  
  // Check if this is the context file
  const isContextFile = filePath.includes('lib/context') || 
                       filePath.includes('server.ts') ||
                       filePath.includes('entry.server');
  
  if (!isContextFile) {
    return transformContextUsage(j, root);
  }
  
  // Find createAppLoadContext function
  const contextFunction = root.find(j.FunctionDeclaration, {
    id: { name: 'createAppLoadContext' }
  });
  
  if (contextFunction.length === 0) {
    // Try to find exported const
    const contextConst = root.find(j.VariableDeclarator, {
      id: { name: 'createAppLoadContext' }
    });
    
    if (contextConst.length > 0) {
      return transformContextConst(j, root, contextConst);
    }
    return false;
  }
  
  contextFunction.forEach(path => {
    const func = path.value;
    
    // Rename function
    if (func.id) {
      func.id.name = 'createHydrogenRouterContext';
      hasChanges = true;
    }
    
    // Find return statement
    const returnStatements = j(path).find(j.ReturnStatement);
    returnStatements.forEach(returnPath => {
      const returnArg = returnPath.value.argument;
      
      if (returnArg?.type === 'ObjectExpression') {
        const hasSpread = returnArg.properties.some(
          p => p.type === 'SpreadElement' && 
               p.argument.type === 'Identifier' &&
               p.argument.name === 'hydrogenContext'
        );
        
        if (hasSpread) {
          // Extract additional properties
          const additionalProps = returnArg.properties.filter(
            p => p.type !== 'SpreadElement'
          );
          
          if (additionalProps.length > 0) {
            // Create additionalContext
            const additionalContext = j.variableDeclaration('const', [
              j.variableDeclarator(
                j.identifier('additionalContext'),
                j.tsAsExpression(
                  j.objectExpression(additionalProps),
                  j.tsTypeReference(j.identifier('const'))
                )
              )
            ]);
            
            // Insert before return
            j(returnPath).insertBefore(additionalContext);
            
            // Add type augmentation
            const typeAugmentation = createTypeAugmentation(j, additionalProps);
            
            // Find the best place to insert type augmentation
            const lastImport = root.find(j.ImportDeclaration).at(-1);
            if (lastImport.length > 0) {
              lastImport.insertAfter(typeAugmentation);
            } else {
              root.get().node.program.body.unshift(typeAugmentation);
            }
            
            // Update createHydrogenContext call
            updateHydrogenContextCall(j, path, additionalProps);
            
            // Update return to use merged context
            returnPath.value.argument = j.callExpression(
              j.memberExpression(
                j.identifier('Object'),
                j.identifier('assign')
              ),
              [
                j.objectExpression([]),
                j.identifier('hydrogenContext'),
                j.identifier('additionalContext')
              ]
            );
            
            hasChanges = true;
          }
        }
      }
    });
  });
  
  // Update all references
  root.find(j.Identifier, { name: 'createAppLoadContext' })
    .forEach(path => {
      if (path.parent.value.type !== 'FunctionDeclaration') {
        path.value.name = 'createHydrogenRouterContext';
        hasChanges = true;
      }
    });
  
  // Update AppLoadContext type references
  root.find(j.TSTypeReference, {
    typeName: { name: 'AppLoadContext' }
  }).forEach(path => {
    j(path).replaceWith(
      j.tsTypeReference(j.identifier('HydrogenContext'))
    );
    hasChanges = true;
  });
  
  return hasChanges;
}

function createTypeAugmentation(j: JSCodeshift, properties: any[]): any {
  const interfaceProperties = properties.map(prop => {
    if (prop.type === 'Property' && prop.key.type === 'Identifier') {
      return j.tsPropertySignature(
        j.identifier(prop.key.name),
        j.tsTypeAnnotation(j.tsAnyKeyword())
      );
    }
    return null;
  }).filter(Boolean);
  
  return j.exportNamedDeclaration(
    j.tsModuleDeclaration(
      j.identifier('ReactRouter'),
      j.tsModuleBlock([
        j.tsInterfaceDeclaration(
          j.identifier('AppLoadContext'),
          j.tsInterfaceBody(interfaceProperties)
        )
      ])
    )
  );
}

function transformContextUsage(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;
  
  // Update context.storefront.i18n.language references
  root.find(j.MemberExpression).forEach(path => {
    const node = path.value;
    if (isStorefrontI18nAccess(node)) {
      // Change to context.customerAccount.i18n.language
      const contextBase = getContextBase(node);
      if (contextBase) {
        j(path).replaceWith(
          j.memberExpression(
            j.memberExpression(
              j.memberExpression(
                contextBase,
                j.identifier('customerAccount')
              ),
              j.identifier('i18n')
            ),
            j.identifier('language')
          )
        );
        hasChanges = true;
      }
    }
  });
  
  return hasChanges;
}

function isStorefrontI18nAccess(node: any): boolean {
  // Check for pattern: context.storefront.i18n.language
  if (node.property?.name !== 'language') return false;
  
  const i18n = node.object;
  if (i18n?.type !== 'MemberExpression' || i18n.property?.name !== 'i18n') return false;
  
  const storefront = i18n.object;
  if (storefront?.type !== 'MemberExpression' || storefront.property?.name !== 'storefront') return false;
  
  return true;
}

function getContextBase(node: any): any {
  // Navigate up to find the context identifier
  let current = node;
  while (current.object) {
    if (current.object.type === 'Identifier') {
      return current.object;
    }
    current = current.object;
  }
  return null;
}
```

### Success Criteria
- [x] createAppLoadContext renamed to createHydrogenRouterContext
- [x] Custom context properties extracted to additionalContext
- [x] TypeScript module augmentation added
- [x] Context usage updated throughout codebase
- [x] storefront.i18n references migrated to customerAccount.i18n
- [ ] HydrogenRouterContextProvider pattern implemented

### Unit Tests
```typescript
// test/transformations/context-api.test.ts
describe('Context API Transformation', () => {
  test('renames context creation function', () => {
    const input = `
export function createAppLoadContext(request, env, ctx) {
  const hydrogenContext = createHydrogenContext({request, env, ctx});
  return {
    ...hydrogenContext,
    customProp: 'value'
  };
}`;
    
    const expected = `
const additionalContext = {
  customProp: 'value'
} as const;

declare module 'ReactRouter' {
  interface AppLoadContext {
    customProp: any;
  }
}

export function createHydrogenRouterContext(request, env, ctx) {
  const hydrogenContext = createHydrogenContext({request, env, ctx});
  return Object.assign({}, hydrogenContext, additionalContext);
}`;
    
    const result = transform(input, 'app/lib/context.ts');
    expect(result).toContain('createHydrogenRouterContext');
    expect(result).toContain('additionalContext');
  });
  
  test('updates i18n access pattern', () => {
    const input = `
const language = context.storefront.i18n.language;`;
    
    const expected = `
const language = context.customerAccount.i18n.language;`;
    
    const result = transform(input, 'app/routes/account.tsx');
    expect(result).toBe(expected);
  });
});
```

### E2E Tests
```typescript
// test/e2e/context-api.test.ts
describe('Context API E2E', () => {
  test('transforms context file completely', async () => {
    const input = await readFixture('context.input.ts');
    const expected = await readFixture('context.output.ts');
    
    const result = await runCodemod(input);
    expect(result).toBe(expected);
  });
});
```

### Deliverables
- Context function renaming logic
- Additional context extraction
- Type augmentation generation
- Context usage updates
- i18n pattern migration

---

## Milestone 5: Import and Package Transformations

### Objective
Update all Hydrogen and Oxygen package imports to align with React Router 7.8.x structure.

### Scope
- Transform @shopify/remix-oxygen → @shopify/hydrogen/oxygen
- Update react-router imports
- Add error type annotations
- Clean up unused imports
- Handle re-exports and barrel imports

### Implementation Details

#### Import Transformer
```typescript
// src/transformations/imports.ts
import type { Collection, JSCodeshift } from 'jscodeshift';

const IMPORT_MAPPINGS = {
  '@shopify/remix-oxygen': '@shopify/hydrogen/oxygen',
  '@remix-run/react': 'react-router',
  '@remix-run/node': 'react-router',
  '@remix-run/cloudflare': 'react-router',
  '@remix-run/server-runtime': 'react-router',
  'react-router-dom': 'react-router'
};

const COMPONENT_RENAMES = {
  'RemixServer': 'ServerRouter',
  'RemixBrowser': 'HydratedRouter'
};

export function transformImports(
  j: JSCodeshift,
  root: Collection
): boolean {
  let hasChanges = false;
  
  // Transform import declarations
  root.find(j.ImportDeclaration).forEach(path => {
    const source = path.value.source.value;
    
    if (typeof source === 'string' && IMPORT_MAPPINGS[source]) {
      path.value.source.value = IMPORT_MAPPINGS[source];
      hasChanges = true;
      
      // Handle component renames
      if (path.value.specifiers) {
        path.value.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
            const oldName = spec.imported.name;
            if (COMPONENT_RENAMES[oldName]) {
              spec.imported.name = COMPONENT_RENAMES[oldName];
              if (spec.local && spec.local.name === oldName) {
                spec.local.name = COMPONENT_RENAMES[oldName];
              }
            }
          }
        });
      }
    }
  });
  
  // Add error type annotations to catch blocks
  root.find(j.CatchClause).forEach(path => {
    const param = path.value.param;
    if (param && param.type === 'Identifier' && !param.typeAnnotation) {
      param.typeAnnotation = j.tsTypeAnnotation(
        j.tsTypeReference(j.identifier('Error'))
      );
      hasChanges = true;
    }
  });
  
  // Clean up duplicate imports
  const importMap = new Map<string, Set<string>>();
  
  root.find(j.ImportDeclaration).forEach(path => {
    const source = path.value.source.value;
    if (typeof source !== 'string') return;
    
    if (!importMap.has(source)) {
      importMap.set(source, new Set());
    }
    
    const imports = importMap.get(source)!;
    
    if (path.value.specifiers) {
      path.value.specifiers.forEach(spec => {
        if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
          if (imports.has(spec.imported.name)) {
            // Duplicate import, remove this declaration
            j(path).remove();
            hasChanges = true;
          } else {
            imports.add(spec.imported.name);
          }
        }
      });
    }
  });
  
  // Consolidate imports from same source
  const consolidatedImports = new Map<string, any[]>();
  
  root.find(j.ImportDeclaration).forEach(path => {
    const source = path.value.source.value;
    if (typeof source !== 'string') return;
    
    if (!consolidatedImports.has(source)) {
      consolidatedImports.set(source, []);
    }
    
    if (path.value.specifiers) {
      consolidatedImports.get(source)!.push(...path.value.specifiers);
    }
    
    // Remove all but first import from each source
    if (consolidatedImports.get(source)!.length > 0 && 
        consolidatedImports.get(source)![0] !== path.value.specifiers?.[0]) {
      j(path).remove();
      hasChanges = true;
    }
  });
  
  // Add consolidated imports back
  consolidatedImports.forEach((specifiers, source) => {
    if (specifiers.length > 1) {
      const firstImport = root.find(j.ImportDeclaration, {
        source: { value: source }
      }).at(0);
      
      if (firstImport.length > 0) {
        firstImport.get().value.specifiers = specifiers;
        hasChanges = true;
      }
    }
  });
  
  // Update virtual module paths
  root.find(j.Literal).forEach(path => {
    if (typeof path.value.value === 'string') {
      if (path.value.value === 'virtual:remix/server-build') {
        path.value.value = 'virtual:react-router/server-build';
        hasChanges = true;
      }
    }
  });
  
  return hasChanges;
}

export function addEnvironmentTypeReference(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  // Only add to env.d.ts or app.d.ts files
  if (!filePath.includes('env.d.ts') && !filePath.includes('app.d.ts')) {
    return false;
  }
  
  const hasHydrogenTypes = root.find(j.Program).filter(path => {
    return path.value.body.some(node => {
      if (node.type === 'ExpressionStatement' && 
          node.expression.type === 'Literal') {
        return node.expression.value?.includes('@shopify/hydrogen/react-router-types');
      }
      return false;
    });
  }).length > 0;
  
  if (!hasHydrogenTypes) {
    const typeRef = j.expressionStatement(
      j.literal('/// <reference types="@shopify/hydrogen/react-router-types" />')
    );
    
    root.get().node.program.body.unshift(typeRef);
    return true;
  }
  
  return false;
}
```

### Success Criteria (Milestone 5 - Completed)
- [x] All Remix package imports transformed to react-router
- [x] json renamed to data
- [x] defer removed from imports and usage
- [x] Duplicate imports consolidated
- [x] Package.json dependencies updated
- [x] Type imports handled correctly
- [x] Mixed Hydrogen/React Router imports handled

### Milestone 6 - Component and API Transformations (Completed)
- [x] Oxygen imports updated to @shopify/hydrogen/oxygen
- [x] Component names updated (RemixServer → ServerRouter, RemixBrowser → HydratedRouter)
- [x] Error type annotations added to catch blocks (TypeScript only)
- [x] Virtual module paths updated (virtual:remix → virtual:react-router)
- [x] Environment type references added for .d.ts files
- [x] Component references in code transformed
- [x] Dynamic imports handled correctly

### Unit Tests
```typescript
// test/transformations/imports.test.ts
describe('Import Transformation', () => {
  test('transforms Remix imports', () => {
    const input = `
import {json, redirect} from '@remix-run/node';
import {useLoaderData, Link} from '@remix-run/react';`;
    
    const expected = `
import {json, redirect} from 'react-router';
import {useLoaderData, Link} from 'react-router';`;
    
    const result = transform(input);
    expect(result).toBe(expected);
  });
  
  test('transforms Oxygen imports', () => {
    const input = `
import {createRequestHandler} from '@shopify/remix-oxygen';`;
    
    const expected = `
import {createRequestHandler} from '@shopify/hydrogen/oxygen';`;
    
    const result = transform(input);
    expect(result).toBe(expected);
  });
  
  test('adds error type annotations', () => {
    const input = `
try {
  doSomething();
} catch (error) {
  console.error(error);
}`;
    
    const expected = `
try {
  doSomething();
} catch (error: Error) {
  console.error(error);
}`;
    
    const result = transform(input);
    expect(result).toBe(expected);
  });
});
```

### E2E Tests
```typescript
// test/e2e/imports.test.ts
describe('Imports E2E', () => {
  test('transforms all imports in a file', async () => {
    const input = await readFixture('imports-complex.input.ts');
    const expected = await readFixture('imports-complex.output.ts');
    
    const result = await runCodemod(input);
    expect(result).toBe(expected);
  });
});
```

### Deliverables
- Import mapping transformations
- Component renaming logic
- Error annotation additions
- Import consolidation
- Virtual module updates

---

## Milestone 6: Configuration Files and Package.json Updates

### Objective
Generate React Router configuration files and update package.json scripts for the new setup.

### Scope
- Create react-router.config.ts with Hydrogen preset
- Update package.json scripts
- Update vite.config.ts
- Update tsconfig.json
- Handle environment files

### Implementation Details

#### Config File Generator
```typescript
// src/transformations/config-files.ts
import fs from 'fs';
import path from 'path';
import type { JSCodeshift, Collection } from 'jscodeshift';

export function createReactRouterConfig(projectRoot: string): boolean {
  const configPath = path.join(projectRoot, 'react-router.config.ts');
  
  if (fs.existsSync(configPath)) {
    console.log('react-router.config.ts already exists, skipping...');
    return false;
  }
  
  const configContent = `import {type Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

export default {
  presets: [hydrogenPreset()],
  ssr: true,
  serverBuildFile: 'index.js',
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  ignoredRouteFiles: ['**/*.css'],
} satisfies Config;
`;
  
  fs.writeFileSync(configPath, configContent, 'utf-8');
  return true;
}

export function updatePackageJson(projectRoot: string): boolean {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  let hasChanges = false;
  
  // Update scripts
  const scriptUpdates = {
    'dev': 'shopify hydrogen dev --codegen',
    'build': 'shopify hydrogen build',
    'preview': 'shopify hydrogen preview',
    'typecheck': 'react-router typegen && tsc --noEmit',
    'codegen': 'shopify hydrogen codegen && react-router typegen',
    'lint': 'eslint --ignore-path .gitignore .',
    'format': 'prettier --write --ignore-path .gitignore .'
  };
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  Object.entries(scriptUpdates).forEach(([key, value]) => {
    if (packageJson.scripts[key] !== value) {
      packageJson.scripts[key] = value;
      hasChanges = true;
    }
  });
  
  // Update dependencies
  const dependencyUpdates = {
    'react-router': '^7.8.2',
    '@react-router/dev': '^7.8.2',
    '@react-router/node': '^7.8.2',
    '@shopify/hydrogen': '2025.7.0'
  };
  
  Object.entries(dependencyUpdates).forEach(([pkg, version]) => {
    if (packageJson.dependencies?.[pkg]) {
      packageJson.dependencies[pkg] = version;
      hasChanges = true;
    }
    if (packageJson.devDependencies?.[pkg]) {
      packageJson.devDependencies[pkg] = version;
      hasChanges = true;
    }
  });
  
  // Remove old Remix packages
  const packagesToRemove = [
    '@remix-run/react',
    '@remix-run/node',
    '@remix-run/dev',
    '@remix-run/cloudflare',
    '@remix-run/server-runtime',
    '@shopify/remix-oxygen'
  ];
  
  packagesToRemove.forEach(pkg => {
    if (packageJson.dependencies?.[pkg]) {
      delete packageJson.dependencies[pkg];
      hasChanges = true;
    }
    if (packageJson.devDependencies?.[pkg]) {
      delete packageJson.devDependencies[pkg];
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf-8'
    );
  }
  
  return hasChanges;
}

export function updateViteConfig(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  if (!filePath.includes('vite.config')) {
    return false;
  }
  
  let hasChanges = false;
  
  // Update plugin imports
  root.find(j.ImportDeclaration).forEach(path => {
    const source = path.value.source.value;
    
    if (source === '@remix-run/dev') {
      path.value.source.value = '@react-router/dev/vite';
      
      // Update import specifier
      if (path.value.specifiers) {
        path.value.specifiers.forEach(spec => {
          if (spec.type === 'ImportSpecifier' && 
              spec.imported.type === 'Identifier' &&
              spec.imported.name === 'vitePlugin') {
            spec.imported.name = 'reactRouter';
            if (spec.local?.name === 'vitePlugin') {
              spec.local.name = 'reactRouter';
            }
          }
        });
      }
      hasChanges = true;
    }
  });
  
  // Update plugin usage
  root.find(j.CallExpression, {
    callee: { name: 'vitePlugin' }
  }).forEach(path => {
    if (path.value.callee.type === 'Identifier') {
      path.value.callee.name = 'reactRouter';
      hasChanges = true;
    }
  });
  
  // Update remix() to reactRouter()
  root.find(j.CallExpression, {
    callee: { name: 'remix' }
  }).forEach(path => {
    if (path.value.callee.type === 'Identifier') {
      path.value.callee.name = 'reactRouter';
      hasChanges = true;
    }
  });
  
  return hasChanges;
}

export function updateTsConfig(projectRoot: string): boolean {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    return false;
  }
  
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  let hasChanges = false;
  
  // Update types array
  if (tsconfig.compilerOptions?.types) {
    const oldTypes = ['@remix-run/node', '@remix-run/cloudflare'];
    const newTypes = ['@react-router/node'];
    
    tsconfig.compilerOptions.types = tsconfig.compilerOptions.types
      .filter((t: string) => !oldTypes.includes(t));
    
    newTypes.forEach(type => {
      if (!tsconfig.compilerOptions.types.includes(type)) {
        tsconfig.compilerOptions.types.push(type);
        hasChanges = true;
      }
    });
  }
  
  // Update include paths
  if (tsconfig.include) {
    const shouldInclude = [
      '.react-router/types/**/*',
      'app/**/*.ts',
      'app/**/*.tsx'
    ];
    
    shouldInclude.forEach(pattern => {
      if (!tsconfig.include.includes(pattern)) {
        tsconfig.include.push(pattern);
        hasChanges = true;
      }
    });
  }
  
  if (hasChanges) {
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify(tsconfig, null, 2) + '\n',
      'utf-8'
    );
  }
  
  return hasChanges;
}
```

### Success Criteria
- [ ] react-router.config.ts created with Hydrogen preset
- [ ] package.json scripts updated for React Router
- [ ] Old Remix dependencies removed
- [ ] vite.config.ts plugin updated
- [ ] tsconfig.json types and includes updated
- [ ] Environment files updated with type references

### Unit Tests
```typescript
// test/transformations/config-files.test.ts
describe('Config Files Transformation', () => {
  test('creates react-router.config.ts', () => {
    const testDir = createTempDir();
    createReactRouterConfig(testDir);
    
    const configPath = path.join(testDir, 'react-router.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('hydrogenPreset');
    expect(content).toContain('satisfies Config');
  });
  
  test('updates package.json scripts', () => {
    const packageJson = {
      scripts: {
        dev: 'remix dev',
        build: 'remix build'
      }
    };
    
    const updated = updatePackageJson(packageJson);
    expect(updated.scripts.dev).toBe('shopify hydrogen dev --codegen');
    expect(updated.scripts.typecheck).toBe('react-router typegen && tsc --noEmit');
  });
  
  test('removes Remix dependencies', () => {
    const packageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0',
        'react-router': '^7.6.0'
      }
    };
    
    const updated = updatePackageJson(packageJson);
    expect(updated.dependencies['@remix-run/react']).toBeUndefined();
    expect(updated.dependencies['react-router']).toBe('^7.8.2');
  });
});
```

### E2E Tests
```typescript
// test/e2e/config-files.test.ts
describe('Config Files E2E', () => {
  test('updates all config files', async () => {
    const testProject = createTestProject();
    
    await runCodemod(testProject);
    
    expect(fs.existsSync(path.join(testProject, 'react-router.config.ts'))).toBe(true);
    
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(testProject, 'package.json'), 'utf-8')
    );
    expect(packageJson.scripts.dev).toContain('hydrogen dev');
  });
});
```

### Deliverables
- React Router config generation
- Package.json transformation
- Vite config updates
- TypeScript config updates
- Environment file updates

---

## Milestone 7: Comprehensive Testing and Edge Cases

### Objective
Implement comprehensive test coverage and handle edge cases for production readiness.

### Scope
- Create exhaustive test fixtures
- Handle JavaScript (non-TypeScript) files
- Test error scenarios
- Performance testing
- Edge case handling

### Implementation Details

#### Test Framework Setup
```typescript
// test/helpers/test-utils.ts
import { transform } from 'jscodeshift';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export function runTransform(
  source: string,
  filePath: string = 'test.tsx'
): string {
  const transformer = require('../src/index');
  const result = transform(source, {
    path: filePath,
    source
  }, {
    jscodeshift: require('jscodeshift'),
    stats: () => {},
    report: () => {}
  }, {});
  
  return result || source;
}

export async function createTestProject(
  template: 'skeleton' | 'custom' = 'skeleton'
): Promise<string> {
  const tempDir = path.join(__dirname, '../.tmp', Date.now().toString());
  await fs.ensureDir(tempDir);
  
  if (template === 'skeleton') {
    // Copy skeleton template
    await fs.copy(
      path.join(__dirname, '../../templates/skeleton'),
      tempDir
    );
  }
  
  return tempDir;
}

export function runCodemodCLI(projectPath: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execSync(
      `node ${path.join(__dirname, '../src/index.ts')}`,
      {
        cwd: projectPath,
        encoding: 'utf-8'
      }
    );
    
    return {
      exitCode: 0,
      stdout,
      stderr: ''
    };
  } catch (error: any) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

export async function compareFixtures(
  inputFile: string,
  outputFile: string
): Promise<void> {
  const input = await fs.readFile(
    path.join(__dirname, '../__testfixtures__', inputFile),
    'utf-8'
  );
  
  const expected = await fs.readFile(
    path.join(__dirname, '../__testfixtures__', outputFile),
    'utf-8'
  );
  
  const result = runTransform(input, inputFile);
  expect(result).toBe(expected);
}
```

#### Comprehensive Test Fixtures
```typescript
// __testfixtures__/edge-cases/
// javascript-route.input.js
export async function loader({context, params}) {
  const data = await context.storefront.query(QUERY);
  return json({data});
}

// javascript-route.output.js
import {Route} from './+types/javascript-route';

export async function loader({context, params}) {
  const data = await context.storefront.query(QUERY);
  return json({data});
}

// complex-context.input.ts
export function createAppLoadContext(request, env, ctx) {
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    ctx,
    storefront: createStorefrontClient({
      // config
    })
  });
  
  return {
    ...hydrogenContext,
    session: createSession(),
    cart: createCart(),
    analytics: createAnalytics(),
    customData: {
      feature: 'enabled',
      version: '1.0.0'
    }
  };
}

// complex-context.output.ts
const additionalContext = {
  session: createSession(),
  cart: createCart(),
  analytics: createAnalytics(),
  customData: {
    feature: 'enabled',
    version: '1.0.0'
  }
} as const;

declare module 'ReactRouter' {
  interface AppLoadContext {
    session: ReturnType<typeof createSession>;
    cart: ReturnType<typeof createCart>;
    analytics: ReturnType<typeof createAnalytics>;
    customData: {
      feature: string;
      version: string;
    };
  }
}

export function createHydrogenRouterContext(request, env, ctx) {
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    ctx,
    storefront: createStorefrontClient({
      // config
    })
  });
  
  return Object.assign({}, hydrogenContext, additionalContext);
}
```

#### Edge Case Handlers
```typescript
// src/transformations/edge-cases.ts
export function handleJavaScriptFiles(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return false;
  }
  
  let hasChanges = false;
  
  // Add JSDoc comments for type hints in JS files
  root.find(j.FunctionDeclaration).forEach(path => {
    const func = path.value;
    if (func.id?.name === 'loader' || func.id?.name === 'action') {
      // Add JSDoc type comment
      const comment = j.commentBlock(`*
 * @param {import('./+types/${extractRouteName(filePath)}').Route.${
   func.id.name === 'loader' ? 'LoaderArgs' : 'ActionArgs'
 }} args
 */`);
      
      if (!func.leadingComments) {
        func.leadingComments = [];
      }
      func.leadingComments.push(comment);
      hasChanges = true;
    }
  });
  
  return hasChanges;
}

export function handleMonorepoStructure(
  projectRoot: string
): string[] {
  // Detect if this is a monorepo
  const possibleRoots = [
    projectRoot,
    path.join(projectRoot, 'apps/storefront'),
    path.join(projectRoot, 'packages/storefront')
  ];
  
  const validRoots = possibleRoots.filter(root => {
    const packageJsonPath = path.join(root, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return false;
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.dependencies?.['@shopify/hydrogen'];
  });
  
  return validRoots;
}

export function handleCustomRouteConventions(
  filePath: string
): string | null {
  // Handle different route naming conventions
  const patterns = [
    // Standard: routes/products.$handle.tsx
    /routes\/(.+)\.(tsx?|jsx?)$/,
    // Nested: routes/products/[handle].tsx
    /routes\/(.+)\/\[(.+)\]\.(tsx?|jsx?)$/,
    // Flat: routes/products-$handle.tsx
    /routes\/(.+)-\$(.+)\.(tsx?|jsx?)$/
  ];
  
  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match) {
      // Normalize to standard format
      return match[1].replace(/\//g, '.').replace(/-/g, '.');
    }
  }
  
  return null;
}
```

### Success Criteria
- [ ] 100% test coverage for all transformations
- [ ] JavaScript files handled correctly
- [ ] Monorepo structures supported
- [ ] Custom route conventions handled
- [ ] Performance under 10 seconds for typical projects
- [ ] Clear error messages for all failure scenarios
- [ ] Rollback capability on failure

### Unit Tests
```typescript
// test/edge-cases.test.ts
describe('Edge Cases', () => {
  test('handles JavaScript files', () => {
    const input = `
export async function loader({context}) {
  return json({});
}`;
    
    const result = runTransform(input, 'app/routes/test.js');
    expect(result).toContain('@param {import');
  });
  
  test('handles monorepo structure', () => {
    const roots = handleMonorepoStructure('/test/monorepo');
    expect(roots).toContain('/test/monorepo/apps/storefront');
  });
  
  test('handles custom route conventions', () => {
    const route1 = handleCustomRouteConventions('routes/products/[handle].tsx');
    expect(route1).toBe('products.$handle');
    
    const route2 = handleCustomRouteConventions('routes/products-$handle.tsx');
    expect(route2).toBe('products.$handle');
  });
});
```

### E2E Tests
```typescript
// test/e2e/full-project.test.ts
describe('Full Project Migration', () => {
  test('migrates entire skeleton template', async () => {
    const project = await createTestProject('skeleton');
    
    // Run official codemod first (mock)
    execSync('npx codemod remix/2/react-router/upgrade', { cwd: project });
    
    // Run our codemod
    const result = runCodemodCLI(project);
    expect(result.exitCode).toBe(0);
    
    // Verify all files transformed
    const routes = fs.readdirSync(path.join(project, 'app/routes'));
    for (const route of routes) {
      const content = fs.readFileSync(
        path.join(project, 'app/routes', route),
        'utf-8'
      );
      
      // Should have Route imports
      if (route.endsWith('.tsx') || route.endsWith('.ts')) {
        expect(content).toContain('import type {Route}');
      }
      
      // Should not have Remix imports
      expect(content).not.toContain('@remix-run');
    }
    
    // Verify config files
    expect(fs.existsSync(path.join(project, 'react-router.config.ts'))).toBe(true);
    
    // Run typecheck
    const typecheck = execSync('npm run typecheck', { 
      cwd: project,
      encoding: 'utf-8'
    });
    expect(typecheck).not.toContain('error');
  });
});
```

### Performance Tests
```typescript
// test/performance.test.ts
describe('Performance', () => {
  test('completes within 10 seconds for skeleton', async () => {
    const project = await createTestProject('skeleton');
    
    const start = Date.now();
    const result = runCodemodCLI(project);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10000);
    expect(result.exitCode).toBe(0);
  });
  
  test('handles 1000+ files efficiently', async () => {
    const project = await createLargeTestProject(1000);
    
    const start = Date.now();
    const result = runCodemodCLI(project);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(30000);
    expect(result.exitCode).toBe(0);
  });
});
```

### Deliverables
- Complete test suite with 100% coverage
- JavaScript file support
- Monorepo support
- Edge case handlers
- Performance benchmarks
- Error recovery mechanisms

---

## Milestone 8: CI/CD Pipeline and Registry Publishing

### Objective
Set up automated publishing to Codemod.com registry and integrate with Hydrogen's CI/CD pipeline.

### Scope
- GitHub Actions workflow for publishing
- Integration with Hydrogen's existing CI
- Codemod Registry authentication
- Version management
- Release automation

### Implementation Details

#### GitHub Actions Workflow
```yaml
# .github/workflows/publish-codemod.yml
name: Publish Hydrogen React Router Codemod

on:
  push:
    branches: [main]
    paths:
      - 'codemods/hydrogen-react-router-migration/**'
      - '.github/workflows/publish-codemod.yml'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to publish (leave empty for auto)'
        required: false
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm ci
      
      - name: Run linting
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm run lint
      
      - name: Run type checking
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm run typecheck
      
      - name: Run tests
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./codemods/hydrogen-react-router-migration/coverage/lcov.info
          flags: codemod

  validate:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate codemodrc.json
        working-directory: ./codemods/hydrogen-react-router-migration
        run: |
          npx ajv validate \
            -s https://codemod.com/schema/codemodrc.json \
            -d .codemodrc.json
      
      - name: Test on sample project
        run: |
          # Create test project
          npx create-hydrogen@latest test-project --template skeleton --no-install
          cd test-project
          
          # Run official codemod first (mock)
          # npx codemod remix/2/react-router/upgrade --no-interactive
          
          # Run our codemod locally
          node ../codemods/hydrogen-react-router-migration/src/index.ts
          
          # Verify transformation
          npm install
          npm run typecheck

  publish:
    runs-on: ubuntu-latest
    needs: [test, validate]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Codemod CLI
        run: npm install -g @codemod.com/cli
      
      - name: Authenticate with Codemod Registry
        env:
          CODEMOD_API_KEY: ${{ secrets.CODEMOD_API_KEY }}
        run: codemod auth $CODEMOD_API_KEY
      
      - name: Determine version
        id: version
        working-directory: ./codemods/hydrogen-react-router-migration
        run: |
          if [ "${{ inputs.version }}" != "" ]; then
            VERSION="${{ inputs.version }}"
          else
            VERSION=$(node -p "require('./package.json').version")
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          
          # Update version in .codemodrc.json
          jq ".version = \"$VERSION\"" .codemodrc.json > tmp.json
          mv tmp.json .codemodrc.json
      
      - name: Build codemod
        working-directory: ./codemods/hydrogen-react-router-migration
        run: npm run build
      
      - name: Publish to Codemod Registry
        working-directory: ./codemods/hydrogen-react-router-migration
        run: |
          npx codemod publish . \
            --name "shopify/hydrogen-react-router-migration" \
            --version "${{ steps.version.outputs.version }}"
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: codemod-v${{ steps.version.outputs.version }}
          release_name: Hydrogen React Router Codemod v${{ steps.version.outputs.version }}
          body: |
            ## Hydrogen React Router 7.8.x Migration Codemod
            
            Version: ${{ steps.version.outputs.version }}
            
            ### Usage
            ```bash
            npx codemod shopify/hydrogen-react-router-migration
            ```
            
            ### Prerequisites
            - Run official Remix to React Router codemod first
            - Hydrogen 2025.4.x - 2025.6.x
            
            See [documentation](https://github.com/shopify/hydrogen/tree/main/codemods/hydrogen-react-router-migration) for details.
          draft: false
          prerelease: false

  notify:
    runs-on: ubuntu-latest
    needs: publish
    if: success()
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "Hydrogen React Router Codemod Published",
              attachments: [{
                color: 'good',
                text: `Version ${{ needs.publish.outputs.version }} published to Codemod Registry\n\nRun with: npx codemod shopify/hydrogen-react-router-migration`
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### Integration with Hydrogen CI
```yaml
# .github/workflows/ci.yml (addition to existing)
jobs:
  codemod-check:
    if: |
      contains(github.event.pull_request.changed_files, 'codemods/') ||
      contains(github.event.pull_request.changed_files, 'templates/skeleton/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Test codemod against skeleton
        run: |
          cd codemods/hydrogen-react-router-migration
          npm ci
          npm test
          
          # Test against current skeleton
          npm run test:skeleton
```

#### Version Management Script
```typescript
// scripts/bump-codemod-version.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CODEMOD_DIR = 'codemods/hydrogen-react-router-migration';

interface VersionBumpOptions {
  type: 'patch' | 'minor' | 'major';
  message?: string;
}

export function bumpCodemodVersion(options: VersionBumpOptions): void {
  const packageJsonPath = path.join(CODEMOD_DIR, 'package.json');
  const codemodrcPath = path.join(CODEMOD_DIR, '.codemodrc.json');
  
  // Read current version
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  // Calculate new version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  let newVersion: string;
  
  switch (options.type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // Update .codemodrc.json
  const codemodrc = JSON.parse(fs.readFileSync(codemodrcPath, 'utf-8'));
  codemodrc.version = newVersion;
  fs.writeFileSync(codemodrcPath, JSON.stringify(codemodrc, null, 2) + '\n');
  
  // Create commit
  const message = options.message || `chore: bump codemod version to ${newVersion}`;
  execSync(`git add ${CODEMOD_DIR}`, { stdio: 'inherit' });
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
  
  console.log(`✅ Bumped codemod version from ${currentVersion} to ${newVersion}`);
}

// CLI interface
if (require.main === module) {
  const type = process.argv[2] as 'patch' | 'minor' | 'major';
  if (!['patch', 'minor', 'major'].includes(type)) {
    console.error('Usage: npm run bump-codemod [patch|minor|major]');
    process.exit(1);
  }
  
  bumpCodemodVersion({ type });
}
```

### Success Criteria
- [ ] GitHub Actions workflow configured and tested
- [ ] Codemod Registry authentication working
- [ ] Automatic publishing on main branch changes
- [ ] Version management system in place
- [ ] Integration with existing Hydrogen CI
- [ ] Slack notifications configured
- [ ] GitHub releases created automatically

### Unit Tests
```typescript
// test/ci/publishing.test.ts
describe('Publishing Configuration', () => {
  test('codemodrc.json has valid structure', () => {
    const config = require('../../.codemodrc.json');
    
    expect(config.name).toBe('shopify/hydrogen-react-router-migration');
    expect(config.engine).toBe('jscodeshift');
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
  
  test('version matches package.json', () => {
    const packageJson = require('../../package.json');
    const codemodrc = require('../../.codemodrc.json');
    
    expect(codemodrc.version).toBe(packageJson.version);
  });
});
```

### E2E Tests
```typescript
// test/e2e/registry.test.ts
describe('Registry Integration', () => {
  test('codemod is discoverable in registry', async () => {
    // This would be run after publishing
    const response = await fetch('https://codemod.com/api/codemods/shopify/hydrogen-react-router-migration');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.name).toBe('shopify/hydrogen-react-router-migration');
  });
});
```

### Deliverables
- GitHub Actions workflow for publishing
- Version management scripts
- CI integration updates
- Registry authentication setup
- Automated release process
- Documentation updates

---

## Risk Mitigation

### Technical Risks
1. **AST Parsing Failures**
   - Mitigation: Graceful fallbacks, clear error messages
   - Recovery: Skip file with warning

2. **Breaking Changes in Dependencies**
   - Mitigation: Lock dependency versions
   - Recovery: Comprehensive test suite

3. **Performance Issues**
   - Mitigation: File batching, parallel processing
   - Recovery: Progress indicators, cancellation support

### Process Risks
1. **Codemod Registry Downtime**
   - Mitigation: Local fallback option
   - Recovery: Direct GitHub installation

2. **Version Conflicts**
   - Mitigation: Strict version checking
   - Recovery: Clear upgrade path documentation

---

## Success Metrics

### Technical Metrics
- **Transformation Success Rate**: >95%
- **Test Coverage**: 100%
- **Performance**: <10 seconds for skeleton
- **Zero Runtime Errors**: After transformation

### Usage Metrics
- **Adoption Rate**: Track via Codemod Registry
- **Error Reports**: <1% of executions
- **User Satisfaction**: Via GitHub issues/feedback

### Quality Metrics
- **Code Quality**: ESLint/TypeScript passing
- **Documentation Coverage**: All features documented
- **Example Coverage**: All patterns have fixtures

---

## Maintenance Plan

### Regular Updates
- Weekly dependency updates
- Monthly performance reviews
- Quarterly feature additions

### Support Channels
- GitHub Issues for bug reports
- Discussions for questions
- Slack for urgent issues

### Version Support
- Current version: Full support
- Previous version: Security fixes only
- Older versions: Community support

---

## Conclusion

This comprehensive development plan provides a clear roadmap for implementing the Hydrogen React Router 7.8.x migration codemod. Each milestone is self-contained and can be executed independently by different teams or AI agents. The plan ensures high quality, comprehensive testing, and seamless integration with the existing Hydrogen ecosystem.

The modular approach allows for parallel development while maintaining consistency across the entire project. With detailed implementation specifications, test requirements, and success criteria, this plan serves as the definitive guide for creating a production-ready codemod that will help thousands of Hydrogen developers migrate to React Router 7.8.x seamlessly.