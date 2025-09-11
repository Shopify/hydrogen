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
  
  // Transform export declarations
  hasChanges = transformExportDeclarations(j, root, filePath) || hasChanges;
  
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

function transformExportDeclarations(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): boolean {
  let hasChanges = false;
  
  // Transform type re-exports from Remix packages
  root.find(j.ExportNamedDeclaration).forEach((path) => {
    const exportDecl = path.value;
    
    // Check if it's a re-export (has source) and is a type export
    if (exportDecl.source && 'exportKind' in exportDecl && exportDecl.exportKind === 'type') {
      const sourceValue = exportDecl.source.value;
      
      // Check if it's from a Remix package
      if (sourceValue === '@remix-run/node' || sourceValue === '@remix-run/react') {
        const specifiers = exportDecl.specifiers || [];
        const routeTypeSpecifiers: string[] = [];
        const otherSpecifiers: any[] = [];
        
        specifiers.forEach((spec: any) => {
          if (spec.type === 'ExportSpecifier') {
            const exportedName = spec.exported?.name || spec.local?.name;
            
            // Check if it's a type we need to transform
            if (exportedName === 'LoaderArgs' || exportedName === 'ActionArgs' ||
                exportedName === 'LoaderFunctionArgs' || exportedName === 'ActionFunctionArgs' ||
                exportedName === 'MetaFunction' || exportedName === 'LinksFunction' ||
                exportedName === 'HeadersFunction') {
              routeTypeSpecifiers.push(exportedName);
            } else {
              otherSpecifiers.push(spec);
            }
          }
        });
        
        if (routeTypeSpecifiers.length > 0) {
          // Extract route name from file path for the import
          const routeName = extractRouteNameForTypeImport(filePath);
          
          // Add Route type import if not present
          const hasRouteImport = root.find(j.ImportDeclaration).filter(p => 
            p.value.source.value === `./+types/${routeName}` &&
            p.value.specifiers?.some((s: any) => 
              s.type === 'ImportSpecifier' && s.imported?.name === 'Route'
            ) === true
          ).length > 0;
          
          if (!hasRouteImport) {
            const routeImport = j.importDeclaration(
              [j.importSpecifier(j.identifier('Route'))],
              j.literal(`./+types/${routeName}`),
              'type'
            );
            
            // Insert after last import
            const imports = root.find(j.ImportDeclaration);
            if (imports.length > 0) {
              imports.at(-1).insertAfter(routeImport);
            } else {
              root.get().node.program.body.unshift(routeImport);
            }
          }
          
          // Create type aliases and export them
          const typeAliases = routeTypeSpecifiers.map(typeName => {
            // Map old names to new ones
            let newTypeName = typeName;
            if (typeName === 'LoaderFunctionArgs') newTypeName = 'LoaderArgs';
            if (typeName === 'ActionFunctionArgs') newTypeName = 'ActionArgs';
            
            // Create type alias: export type LoaderArgs = Route.LoaderArgs;
            return j.exportNamedDeclaration(
              j.tsTypeAliasDeclaration(
                j.identifier(typeName),
                j.tsTypeReference(
                  j.tsQualifiedName(
                    j.identifier('Route'),
                    j.identifier(newTypeName)
                  )
                )
              ),
              [],
              null
            );
          });
          
          // If there are other specifiers, keep them with react-router source
          if (otherSpecifiers.length > 0) {
            exportDecl.source.value = 'react-router';
            exportDecl.specifiers = otherSpecifiers;
            // Add the new type aliases after this export
            typeAliases.forEach(newExport => {
              j(path).insertAfter(newExport);
            });
          } else {
            // Replace the entire export with the new type aliases
            j(path).replaceWith(typeAliases);
          }
          
          hasChanges = true;
        } else if (sourceValue === '@remix-run/node' || sourceValue === '@remix-run/react') {
          // Just update the source for other exports
          exportDecl.source.value = 'react-router';
          hasChanges = true;
        }
      }
    }
  });
  
  return hasChanges;
}

function extractRouteNameForTypeImport(filePath: string): string {
  // Extract route name from file path (e.g., 'app/routes/products.$id.tsx' -> 'products.$id')
  const match = filePath.match(/routes\/(.*?)\.(tsx?|jsx?)$/);
  if (match) {
    return match[1];
  }
  // Fallback to filename without extension
  const filename = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
  return filename || 'index';
}