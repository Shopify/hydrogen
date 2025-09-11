import type { Collection, JSCodeshift } from 'jscodeshift';
import { extractRouteName, getFileLanguage } from '../detectors/file-filter';
import { TypeScriptStrategy } from '../strategies/typescript';
import { JavaScriptStrategy } from '../strategies/javascript';
import type { ProjectLanguage } from '../detectors/language';

export function transformRouteTypes(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  projectLanguage: ProjectLanguage
): boolean {
  let hasChanges = false;
  
  // Extract route name from file path
  const routeName = extractRouteName(filePath);
  if (!routeName) {
    // Not a route file, skip route type transformations
    return false;
  }
  
  // Determine file language
  const fileLanguage = getFileLanguage(filePath);
  
  // Choose strategy based on file language (not project language)
  // This handles mixed codebases where some files might be JS in a TS project
  const strategy = fileLanguage === 'typescript' 
    ? new TypeScriptStrategy(j)
    : new JavaScriptStrategy(j);
  
  // Check if file has route exports (loader, action, or meta)
  const hasRouteExports = checkForRouteExports(j, root);
  
  if (!hasRouteExports) {
    // No route exports, no need for Route type
    return false;
  }
  
  // Add Route type import (or JSDoc for JS)
  hasChanges = strategy.addRouteTypeImport(root, routeName) || hasChanges;
  
  // Transform loader types
  hasChanges = strategy.transformLoaderType(root) || hasChanges;
  
  // Transform action types
  hasChanges = strategy.transformActionType(root) || hasChanges;
  
  // Transform meta types
  hasChanges = strategy.transformMetaType(root) || hasChanges;
  
  // Clean up old imports
  hasChanges = removeOldTypeImports(j, root) || hasChanges;
  
  return hasChanges;
}

function checkForRouteExports(j: JSCodeshift, root: Collection): boolean {
  // Check for loader function
  const hasLoader = 
    root.find(j.FunctionDeclaration, { id: { name: 'loader' } }).length > 0 ||
    root.find(j.VariableDeclarator, { id: { name: 'loader' } }).length > 0 ||
    root.find(j.ExportNamedDeclaration).filter(path => {
      const declaration = path.value.declaration;
      if (declaration?.type === 'FunctionDeclaration') {
        return declaration.id?.name === 'loader';
      }
      if (declaration?.type === 'VariableDeclaration') {
        return declaration.declarations.some((d: any) => 
          d.id?.name === 'loader'
        );
      }
      return false;
    }).length > 0;
  
  // Check for action function
  const hasAction = 
    root.find(j.FunctionDeclaration, { id: { name: 'action' } }).length > 0 ||
    root.find(j.VariableDeclarator, { id: { name: 'action' } }).length > 0 ||
    root.find(j.ExportNamedDeclaration).filter(path => {
      const declaration = path.value.declaration;
      if (declaration?.type === 'FunctionDeclaration') {
        return declaration.id?.name === 'action';
      }
      if (declaration?.type === 'VariableDeclaration') {
        return declaration.declarations.some((d: any) => 
          d.id?.name === 'action'
        );
      }
      return false;
    }).length > 0;
  
  // Check for meta export
  const hasMeta = 
    root.find(j.VariableDeclarator, { id: { name: 'meta' } }).length > 0 ||
    root.find(j.ExportNamedDeclaration).filter(path => {
      const declaration = path.value.declaration;
      if (declaration?.type === 'VariableDeclaration') {
        return declaration.declarations.some((d: any) => 
          d.id?.name === 'meta'
        );
      }
      const specifiers = path.value.specifiers;
      if (specifiers) {
        return specifiers.some((s: any) => 
          s.exported?.name === 'meta' || s.local?.name === 'meta'
        );
      }
      return false;
    }).length > 0;
  
  return hasLoader || hasAction || hasMeta;
}

function removeOldTypeImports(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;
  const oldTypes = ['LoaderFunctionArgs', 'ActionFunctionArgs', 'MetaFunction'];
  
  // Find and remove old type imports
  root.find(j.ImportSpecifier).forEach(path => {
    const imported = path.value.imported;
    if (imported?.type === 'Identifier' && oldTypes.includes(imported.name)) {
      // Check if this is the only specifier in the import
      const importDeclaration = path.parent.parent.value;
      if (importDeclaration.specifiers?.length === 1) {
        // Remove the entire import statement
        j(path.parent.parent).remove();
      } else {
        // Just remove this specifier
        j(path).remove();
      }
      hasChanges = true;
    }
  });
  
  // Also check for type imports (import type {})
  root.find(j.ImportDeclaration).forEach(path => {
    const specifiers = path.value.specifiers;
    if (!specifiers || specifiers.length === 0) return;
    
    // Filter out old types
    const filteredSpecifiers = specifiers.filter((spec: any) => {
      if (spec.type === 'ImportSpecifier' && spec.imported?.type === 'Identifier') {
        return !oldTypes.includes(spec.imported.name);
      }
      return true;
    });
    
    if (filteredSpecifiers.length < specifiers.length) {
      if (filteredSpecifiers.length === 0) {
        // Remove the entire import if no specifiers left
        j(path).remove();
      } else {
        // Update with filtered specifiers
        path.value.specifiers = filteredSpecifiers;
      }
      hasChanges = true;
    }
  });
  
  return hasChanges;
}