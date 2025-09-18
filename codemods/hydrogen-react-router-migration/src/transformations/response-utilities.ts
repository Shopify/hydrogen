import type { Collection, JSCodeshift } from 'jscodeshift';
import type { ProjectLanguage } from '../detectors/language';

/**
 * Transforms json() and defer() function calls based on React Router v7 migration patterns:
 * 
 * 1. json(data) → data (return plain object)
 * 2. json(data, init) → data(data, init) (when headers/status needed)
 * 3. defer(data) → data (return plain object with promises)
 * 
 * Note: This assumes the imports have already been transformed by transformImports()
 */
export function transformResponseUtilities(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  language: ProjectLanguage
): boolean {
  let hasChanges = false;

  // Track if we need to add data import
  let needsDataImport = false;

  // Check which imports are from @shopify/hydrogen (should NOT be transformed)
  const hydrogenImports = new Set<string>();
  root.find(j.ImportDeclaration).forEach(path => {
    if (path.value.source.value === '@shopify/hydrogen') {
      (path.value.specifiers || []).forEach(spec => {
        if (spec.type === 'ImportSpecifier' && spec.imported?.type === 'Identifier') {
          hydrogenImports.add(spec.imported.name);
        }
      });
    }
  });

  // Transform json() calls (only if NOT from @shopify/hydrogen)
  root.find(j.CallExpression, {
    callee: { name: 'json' }
  }).forEach((path) => {
    // Skip if json is from @shopify/hydrogen
    if (hydrogenImports.has('json')) {
      return;
    }
    const args = path.value.arguments;
    
    if (args.length === 1) {
      // Simple case: json(data) → data
      // Replace the entire call expression with just the argument
      j(path).replaceWith(args[0]);
      hasChanges = true;
    } else if (args.length >= 2) {
      // With options: json(data, init) → data(data, init)
      // Change the function name from json to data
      if (path.value.callee.type === 'Identifier') {
        path.value.callee.name = 'data';
        needsDataImport = true;
        hasChanges = true;
      }
    }
  });

  // Transform defer() calls (only if NOT from @shopify/hydrogen)
  root.find(j.CallExpression, {
    callee: { name: 'defer' }
  }).forEach((path) => {
    // Skip if defer is from @shopify/hydrogen
    if (hydrogenImports.has('defer')) {
      return;
    }
    const args = path.value.arguments;
    
    // defer(data) → data
    // Simply return the object with promises
    if (args.length >= 1) {
      j(path).replaceWith(args[0]);
      hasChanges = true;
    }
  });

  // If we transformed json with options to data, ensure data is imported
  if (needsDataImport) {
    ensureDataImport(j, root);
  }

  return hasChanges;
}

function ensureDataImport(j: JSCodeshift, root: Collection): void {
  // Check if data is already imported from react-router (non-type imports only)
  const reactRouterImports = root.find(j.ImportDeclaration).filter(path => 
    path.value.source.value === 'react-router' && 
    path.value.importKind !== 'type'
  );

  if (reactRouterImports.length === 0) {
    // No react-router import exists, create one
    const dataImport = j.importDeclaration(
      [j.importSpecifier(j.identifier('data'))],
      j.literal('react-router')
    );
    
    // Add after the last import
    const lastImport = root.find(j.ImportDeclaration).at(-1);
    if (lastImport.length > 0) {
      lastImport.insertAfter(dataImport);
    } else {
      // No imports exist, add at the beginning
      const program = root.find(j.Program).get();
      program.value.body.unshift(dataImport);
    }
  } else {
    // Check if data is already imported in non-type imports
    let hasDataImport = false;
    
    reactRouterImports.forEach((importPath) => {
      const specifiers = importPath.value.specifiers || [];
      
      hasDataImport = specifiers.some((spec) => 
        spec.type === 'ImportSpecifier' && 
        spec.imported?.type === 'Identifier' &&
        spec.imported.name === 'data'
      );

      if (!hasDataImport) {
        // Add data to existing react-router import (non-type)
        const dataSpec = j.importSpecifier(j.identifier('data'));
        specifiers.push(dataSpec);
        importPath.value.specifiers = specifiers;
      }
    });
  }
}

/**
 * Analyzes if a json/defer call needs special handling
 */
export function analyzeResponseCall(
  j: JSCodeshift,
  callExpr: any
): { needsData: boolean; isSimple: boolean } {
  const args = callExpr.arguments;
  
  // Check if it's a simple call (just data, no options)
  const isSimple = args.length === 1;
  
  // Check if the second argument has headers or status
  let needsData = false;
  if (args.length >= 2) {
    const initArg = args[1];
    
    // Check if it's an object with status or headers
    if (initArg.type === 'ObjectExpression') {
      needsData = initArg.properties.some((prop: any) => {
        if (prop.key?.type === 'Identifier') {
          return prop.key.name === 'status' || prop.key.name === 'headers';
        }
        return false;
      });
    } else if (initArg.type === 'Literal' && typeof initArg.value === 'number') {
      // Direct status code as second argument
      needsData = true;
    }
  }
  
  return { needsData, isSimple };
}