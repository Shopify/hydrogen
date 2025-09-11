import type { Collection, JSCodeshift } from 'jscodeshift';
import type { ProjectLanguage } from '../detectors/language';

interface ImportMapping {
  from: string[];
  to: string;
  nameChanges?: Record<string, string>;
  remove?: string[];
}

const IMPORT_MAPPINGS: ImportMapping[] = [
  {
    from: ['@shopify/hydrogen'],
    to: 'react-router',
    nameChanges: {
      json: 'data',
    },
    remove: ['defer'],
  },
  {
    from: ['@remix-run/react', '@remix-run/node', '@remix-run/server-runtime'],
    to: 'react-router',
    nameChanges: {
      json: 'data',
    },
    remove: ['defer'],
  },
];

const HYDROGEN_SPECIFIC_EXPORTS = new Set([
  'Analytics',
  'AnalyticsProvider',
  'CartForm',
  'CartProvider',
  'CustomerProvider',
  'Hydrogen',
  'HydrogenProvider',
  'InMemoryCache',
  'Money',
  'Pagination',
  'PaginationProvider',
  'Seo',
  'ShopPayButton',
  'VariantSelector',
  'createStorefrontClient',
  'createCustomerAccountClient',
  'createCartHandler',
  'storefrontRedirect',
  'graphiqlLoader',
  'getPaginationVariables',
  'flattenConnection',
  'getShopAnalytics',
  'parseGid',
  'generateCacheControlHeader',
  'CacheLong',
  'CacheShort',
  'CacheNone',
  'CacheCustom',
  'NO_STORE',
]);

export function transformImports(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  language: ProjectLanguage
): boolean {
  let hasChanges = false;

  for (const mapping of IMPORT_MAPPINGS) {
    for (const fromPackage of mapping.from) {
      // Handle both regular and type imports
      const imports = root.find(j.ImportDeclaration).filter(path => 
        path.value.source.value === fromPackage
      );

      imports.forEach((path) => {
        const importDecl = path.value;
        const specifiers = importDecl.specifiers || [];
        const isTypeImport = importDecl.importKind === 'type';
        
        const remainingHydrogenSpecifiers: any[] = [];
        const reactRouterSpecifiers: any[] = [];
        const removedSpecifiers: string[] = [];

        specifiers.forEach((spec) => {
          if (spec.type === 'ImportSpecifier' && spec.imported?.type === 'Identifier') {
            const importedName = spec.imported.name;
            
            if (mapping.remove?.includes(importedName)) {
              removedSpecifiers.push(importedName);
              hasChanges = true;
              return;
            }

            if (fromPackage === '@shopify/hydrogen' && HYDROGEN_SPECIFIC_EXPORTS.has(importedName)) {
              remainingHydrogenSpecifiers.push(spec);
            } else {
              const newName = mapping.nameChanges?.[importedName];
              if (newName && newName !== importedName) {
                if (spec.local?.name === importedName) {
                  spec.imported.name = newName;
                  spec.local.name = newName;
                } else {
                  spec.imported.name = newName;
                }
                hasChanges = true;
              }
              reactRouterSpecifiers.push(spec);
            }
          } else if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            if (fromPackage === '@shopify/hydrogen') {
              remainingHydrogenSpecifiers.push(spec);
            } else {
              reactRouterSpecifiers.push(spec);
            }
          }
        });

        if (reactRouterSpecifiers.length > 0 || removedSpecifiers.length > 0) {
          hasChanges = true;

          if (remainingHydrogenSpecifiers.length === 0 && reactRouterSpecifiers.length > 0) {
            importDecl.source.value = mapping.to;
            importDecl.specifiers = reactRouterSpecifiers;
          } else if (remainingHydrogenSpecifiers.length > 0 && reactRouterSpecifiers.length > 0) {
            importDecl.specifiers = remainingHydrogenSpecifiers;
            
            // Find existing react-router import (matching type/regular)
            const existingReactRouterImport = root.find(j.ImportDeclaration).filter(p => 
              p.value.source.value === mapping.to && 
              p.value.importKind === (isTypeImport ? 'type' : undefined)
            );

            if (existingReactRouterImport.length > 0) {
              const existing = existingReactRouterImport.at(0).get();
              const existingSpecs = existing.value.specifiers || [];
              
              const existingNames = new Set(
                existingSpecs
                  .filter((s: any) => s.type === 'ImportSpecifier')
                  .map((s: any) => s.imported?.name)
              );

              reactRouterSpecifiers.forEach((spec) => {
                if (spec.type === 'ImportSpecifier' && !existingNames.has(spec.imported?.name)) {
                  existingSpecs.push(spec);
                }
              });

              existing.value.specifiers = existingSpecs;
            } else {
              const newImport = j.importDeclaration(
                reactRouterSpecifiers,
                j.stringLiteral(mapping.to)
              );
              if (isTypeImport) {
                newImport.importKind = 'type';
              }
              j(path).insertAfter(newImport);
            }
          } else if (remainingHydrogenSpecifiers.length > 0 && removedSpecifiers.length > 0) {
            importDecl.specifiers = remainingHydrogenSpecifiers;
          } else {
            j(path).remove();
          }
        }

        if (removedSpecifiers.length > 0) {
          removeDeferUsage(j, root, removedSpecifiers);
        }
        
        // Transform json calls to data calls if json was renamed
        if (mapping.nameChanges?.json === 'data') {
          transformJsonToData(j, root);
        }
      });
    }
  }

  cleanupDuplicateImports(j, root);
  
  return hasChanges;
}

function transformJsonToData(j: JSCodeshift, root: Collection): void {
  // Replace json calls with data calls
  root.find(j.CallExpression, {
    callee: { name: 'json' },
  }).forEach((path) => {
    path.value.callee = j.identifier('data');
  });
  
}

function removeDeferUsage(
  j: JSCodeshift,
  root: Collection,
  removedSpecifiers: string[]
): void {
  // Replace defer calls with data calls
  if (removedSpecifiers.includes('defer')) {
    root.find(j.CallExpression, {
      callee: { name: 'defer' },
    }).forEach((path) => {
      const args = path.value.arguments;
      const newCall = j.callExpression(
        j.identifier('data'),
        args
      );
      j(path).replaceWith(newCall);
    });
  }
}

function cleanupDuplicateImports(j: JSCodeshift, root: Collection): void {
  // Group imports by source AND kind (type vs regular)
  const importsBySourceAndKind = new Map<string, any[]>();

  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.value.source.value as string;
    const kind = path.value.importKind || 'value'; // 'type' or 'value' (default)
    const key = `${source}::${kind}`;
    
    if (!importsBySourceAndKind.has(key)) {
      importsBySourceAndKind.set(key, []);
    }
    importsBySourceAndKind.get(key)!.push(path);
  });

  importsBySourceAndKind.forEach((imports, sourceAndKind) => {
    if (imports.length <= 1) return;

    const allSpecifiers: any[] = [];
    const seenSpecifiers = new Set<string>();

    imports.forEach((importPath, index) => {
      const specifiers = importPath.value.specifiers || [];
      
      specifiers.forEach((spec: any) => {
        const key = getSpecifierKey(spec);
        if (!seenSpecifiers.has(key)) {
          seenSpecifiers.add(key);
          allSpecifiers.push(spec);
        }
      });

      if (index > 0) {
        j(importPath).remove();
      }
    });

    if (imports.length > 0 && allSpecifiers.length > 0) {
      imports[0].value.specifiers = allSpecifiers;
    }
  });
}

function getSpecifierKey(spec: any): string {
  if (spec.type === 'ImportDefaultSpecifier') {
    return `default:${spec.local?.name}`;
  }
  if (spec.type === 'ImportNamespaceSpecifier') {
    return `namespace:${spec.local?.name}`;
  }
  if (spec.type === 'ImportSpecifier') {
    return `named:${spec.imported?.name}:${spec.local?.name}`;
  }
  return '';
}