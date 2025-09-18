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
    from: ['@remix-run/react', '@remix-run/node', '@remix-run/server-runtime'],
    to: 'react-router',
    nameChanges: {},
    remove: ['defer', 'json'],
  },
  {
    from: ['@shopify/remix-oxygen'],
    to: 'react-router',
    nameChanges: {},
    remove: ['defer', 'json'],
  },
];

// Exports that should go to @shopify/hydrogen/oxygen
const OXYGEN_SPECIFIC_EXPORTS = new Set([
  'createRequestHandler',
  'getStorefrontHeaders',
]);

export function transformImports(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  language: ProjectLanguage
): boolean {
  let hasChanges = false;

  // Skip @shopify/hydrogen imports entirely - they should remain untouched
  const hydrogenImports = root.find(j.ImportDeclaration).filter(path => 
    path.value.source.value === '@shopify/hydrogen'
  );
  
  // Don't process @shopify/hydrogen imports at all
  
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
        
        type ImportSpecifierType = ReturnType<JSCodeshift['importSpecifier']> | ReturnType<JSCodeshift['importDefaultSpecifier']> | ReturnType<JSCodeshift['importNamespaceSpecifier']>;
        const reactRouterSpecifiers: ImportSpecifierType[] = [];
        const removedSpecifiers: string[] = [];
        const oxygenSpecifiers: ImportSpecifierType[] = [];
        const addedImports = new Set<string>(); // Track what we've already added
        
        specifiers.forEach((spec) => {
          if (spec.type === 'ImportSpecifier' && spec.imported?.type === 'Identifier') {
            const importedName = spec.imported.name;
            
            if (mapping.remove?.includes(importedName)) {
              removedSpecifiers.push(importedName);
              hasChanges = true;
              return;
            }

            // Special handling for @shopify/remix-oxygen
            if (fromPackage === '@shopify/remix-oxygen' && OXYGEN_SPECIFIC_EXPORTS.has(importedName)) {
              oxygenSpecifiers.push(spec);
            } else {
              const newName = mapping.nameChanges?.[importedName];
              if (newName && newName !== importedName) {
                // Check if we already added this import (e.g., both json and defer -> data)
                if (addedImports.has(newName)) {
                  hasChanges = true;
                  return; // Skip duplicate
                }
                if (spec.local?.name === importedName) {
                  spec.imported.name = newName;
                  spec.local.name = newName;
                } else {
                  spec.imported.name = newName;
                }
                hasChanges = true;
                addedImports.add(newName);
              }
              reactRouterSpecifiers.push(spec);
            }
          } else if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            if (fromPackage === '@shopify/remix-oxygen') {
              oxygenSpecifiers.push(spec);
            } else {
              reactRouterSpecifiers.push(spec);
            }
          }
        });

        if (reactRouterSpecifiers.length > 0 || removedSpecifiers.length > 0 || oxygenSpecifiers.length > 0) {
          hasChanges = true;

          // Handle oxygen specifiers (for createRequestHandler)
          if (oxygenSpecifiers.length > 0) {
            // Check if we have both oxygen and react-router specs
            if (reactRouterSpecifiers.length > 0) {
              // Create/update react-router import
              const existingReactRouterImport = root.find(j.ImportDeclaration).filter(p => 
                p.value.source.value === mapping.to && 
                p.value.importKind === (isTypeImport ? 'type' : undefined)
              );

              if (existingReactRouterImport.length > 0) {
                const existing = existingReactRouterImport.at(0).get();
                const existingSpecs = existing.value.specifiers || [];
                
                const existingNames = new Set(
                  existingSpecs
                    .filter((s: ImportSpecifierType) => s.type === 'ImportSpecifier' && s.imported?.type === 'Identifier')
                    .map((s: ImportSpecifierType) => s.type === 'ImportSpecifier' && s.imported?.type === 'Identifier' ? s.imported.name : '')
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
              
              // Change current import to oxygen
              importDecl.source.value = '@shopify/hydrogen/oxygen';
              importDecl.specifiers = oxygenSpecifiers;
            } else {
              // Only oxygen specs, just change the source
              importDecl.source.value = '@shopify/hydrogen/oxygen';
              importDecl.specifiers = oxygenSpecifiers;
            }
          } else if (reactRouterSpecifiers.length > 0 && oxygenSpecifiers.length === 0) {
            // Only react-router specs, change the source
            importDecl.source.value = mapping.to;
            importDecl.specifiers = reactRouterSpecifiers;
          } else if (removedSpecifiers.length > 0 && reactRouterSpecifiers.length === 0 && oxygenSpecifiers.length === 0) {
            // All specs were removed (e.g., only had defer)
            j(path).remove();
          }
        }

      });
    }
  }

  cleanupDuplicateImports(j, root);
  
  // Transform export declarations
  hasChanges = transformExportDeclarations(j, root, filePath) || hasChanges;
  
  return hasChanges;
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

    type ImportSpecifierType = ReturnType<JSCodeshift['importSpecifier']> | ReturnType<JSCodeshift['importDefaultSpecifier']> | ReturnType<JSCodeshift['importNamespaceSpecifier']>;
    const allSpecifiers: ImportSpecifierType[] = [];
    const seenSpecifiers = new Set<string>();

    imports.forEach((importPath, index) => {
      const specifiers = importPath.value.specifiers || [];
      
      specifiers.forEach((spec: ImportSpecifierType) => {
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

function getSpecifierKey(spec: ReturnType<JSCodeshift['importSpecifier']> | ReturnType<JSCodeshift['importDefaultSpecifier']> | ReturnType<JSCodeshift['importNamespaceSpecifier']>): string {
  if (spec.type === 'ImportDefaultSpecifier') {
    return `default:${spec.local?.name || ''}`;
  }
  if (spec.type === 'ImportNamespaceSpecifier') {
    return `namespace:${spec.local?.name || ''}`;
  }
  if (spec.type === 'ImportSpecifier') {
    const imported = spec.imported?.type === 'Identifier' ? spec.imported.name : '';
    const local = spec.local?.name || '';
    return `named:${imported}:${local}`;
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