import type { FileInfo, API, Options } from 'jscodeshift';

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
): string | undefined {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  if (shouldSkipFile(fileInfo.path)) {
    return undefined;
  }
  
  let hasChanges = false;
  
  // TODO: Apply transformations in subsequent milestones
  // hasChanges = transformRouteTypes(j, root, fileInfo.path) || hasChanges;
  // hasChanges = transformContextAPI(j, root, fileInfo.path) || hasChanges;
  // hasChanges = transformImports(j, root) || hasChanges;
  
  // For now, just a basic transformation to verify setup
  root.find(j.Identifier, { name: 'createAppLoadContext' })
    .forEach(path => {
      if (path.parent.value.type !== 'FunctionDeclaration') {
        path.value.name = 'createHydrogenRouterContext';
        hasChanges = true;
      }
    });
  
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