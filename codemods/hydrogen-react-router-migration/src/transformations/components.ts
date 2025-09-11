import type { Collection, JSCodeshift } from 'jscodeshift';
import type { ProjectLanguage } from '../detectors/language';

const COMPONENT_RENAMES: Record<string, string> = {
  RemixServer: 'ServerRouter',
  RemixBrowser: 'HydratedRouter',
};

const OXYGEN_IMPORT_MAPPING: Record<string, string> = {
  '@shopify/remix-oxygen': '@shopify/hydrogen/oxygen',
  'remix-oxygen': '@shopify/hydrogen/oxygen',
};

const VIRTUAL_MODULE_MAPPINGS: Record<string, string> = {
  'virtual:remix/server-build': 'virtual:react-router/server-build',
};

export function transformComponents(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  language: ProjectLanguage
): boolean {
  let hasChanges = false;

  // Transform component names in imports
  hasChanges = transformComponentImports(j, root) || hasChanges;

  // Transform component usage
  hasChanges = transformComponentUsage(j, root) || hasChanges;

  // Transform Oxygen imports
  hasChanges = transformOxygenImports(j, root) || hasChanges;

  // Transform virtual module paths
  hasChanges = transformVirtualModules(j, root) || hasChanges;

  // Add error type annotations for TypeScript files
  if (language.isTypeScript) {
    hasChanges = addErrorTypeAnnotations(j, root) || hasChanges;
  }

  return hasChanges;
}

function transformComponentImports(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;

  // Transform named imports
  root.find(j.ImportSpecifier).forEach((path) => {
    const imported = path.value.imported;
    if (imported?.type === 'Identifier' && COMPONENT_RENAMES[imported.name]) {
      const newName = COMPONENT_RENAMES[imported.name];
      
      // Update both imported and local if they match
      if (path.value.local?.name === imported.name) {
        path.value.local.name = newName;
      }
      imported.name = newName;
      hasChanges = true;
    }
  });

  return hasChanges;
}

function transformComponentUsage(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;

  // Transform JSX elements
  Object.entries(COMPONENT_RENAMES).forEach(([oldName, newName]) => {
    // Opening elements
    root.find(j.JSXOpeningElement, {
      name: { name: oldName }
    }).forEach((path) => {
      if (path.value.name.type === 'JSXIdentifier') {
        path.value.name.name = newName;
        hasChanges = true;
      }
    });

    // Closing elements
    root.find(j.JSXClosingElement, {
      name: { name: oldName }
    }).forEach((path) => {
      if (path.value.name.type === 'JSXIdentifier') {
        path.value.name.name = newName;
        hasChanges = true;
      }
    });

    // Self-closing elements
    root.find(j.JSXElement).forEach((path) => {
      const opening = path.value.openingElement;
      if (opening.selfClosing && 
          opening.name.type === 'JSXIdentifier' && 
          opening.name.name === oldName) {
        opening.name.name = newName;
        hasChanges = true;
      }
    });

    // References in regular code (not JSX)
    root.find(j.Identifier, { name: oldName }).forEach((path) => {
      // Only transform if it's a reference to the component
      // Skip if it's part of an import/export declaration
      const parent = path.parent?.value;
      if (parent?.type !== 'ImportSpecifier' && 
          parent?.type !== 'ExportSpecifier' &&
          parent?.type !== 'JSXIdentifier') {
        // Check if this is likely a component reference
        if (parent?.type === 'CallExpression' && parent.callee === path.value) {
          path.value.name = newName;
          hasChanges = true;
        } else if (parent?.type === 'NewExpression' && parent.callee === path.value) {
          path.value.name = newName;
          hasChanges = true;
        } else if (parent?.type === 'MemberExpression' && parent.object === path.value) {
          // Component used as object (e.g., RemixServer.Provider)
          path.value.name = newName;
          hasChanges = true;
        } else if (parent?.type === 'VariableDeclarator' && parent.init === path.value) {
          // Variable assignment like: const Server = RemixServer
          path.value.name = newName;
          hasChanges = true;
        } else if (parent?.type === 'CallExpression' && 
                   parent.arguments.includes(path.value)) {
          // Used as argument (e.g., React.createElement(RemixServer))
          path.value.name = newName;
          hasChanges = true;
        }
      }
    });
  });

  return hasChanges;
}

function transformOxygenImports(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;

  Object.entries(OXYGEN_IMPORT_MAPPING).forEach(([oldImport, newImport]) => {
    root.find(j.ImportDeclaration, {
      source: { value: oldImport }
    }).forEach((path) => {
      path.value.source.value = newImport;
      hasChanges = true;
    });

    // Also handle dynamic imports
    root.find(j.CallExpression).forEach((path) => {
      // Check if this is a dynamic import call
      if (path.value.callee.type === 'Import' || 
          (path.value.callee.type === 'Identifier' && path.value.callee.name === 'import')) {
        const arg = path.value.arguments[0];
        if ((arg?.type === 'Literal' || arg?.type === 'StringLiteral') && 
            arg.value === oldImport) {
          arg.value = newImport;
          if ('extra' in arg && arg.extra) {
            const extra = arg.extra as { rawValue?: string; raw?: string };
            extra.rawValue = newImport;
            extra.raw = `'${newImport}'`;
          }
          hasChanges = true;
        }
      }
    });
  });

  return hasChanges;
}

function transformVirtualModules(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;

  Object.entries(VIRTUAL_MODULE_MAPPINGS).forEach(([oldModule, newModule]) => {
    // Static imports
    root.find(j.ImportDeclaration).forEach((path) => {
      if (path.value.source.value === oldModule) {
        path.value.source.value = newModule;
        hasChanges = true;
      }
    });

    // Dynamic imports
    root.find(j.CallExpression, {
      callee: { name: 'import' }
    }).forEach((path) => {
      const arg = path.value.arguments[0];
      if (arg?.type === 'Literal' && arg.value === oldModule) {
        arg.value = newModule;
        hasChanges = true;
      }
    });

    // String literals in general (for config files, etc.)
    root.find(j.Literal).forEach((path) => {
      if (typeof path.value.value === 'string' && path.value.value === oldModule) {
        path.value.value = newModule;
        hasChanges = true;
      }
    });
  });

  return hasChanges;
}

function addErrorTypeAnnotations(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;

  // Find catch clauses without type annotations
  root.find(j.CatchClause).forEach((path) => {
    const param = path.value.param;
    
    if (param && param.type === 'Identifier' && !param.typeAnnotation) {
      // Add : unknown type annotation (safer than Error)
      param.typeAnnotation = j.tsTypeAnnotation(
        j.tsUnknownKeyword()
      );
      hasChanges = true;
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

  // Check if reference already exists
  const hasHydrogenTypes = root.find(j.Program).filter(path => {
    return path.value.body.some(node => {
      // Check for triple-slash directive
      if (node.type === 'ExpressionStatement' && 
          node.expression.type === 'Literal') {
        const value = node.expression.value;
        return typeof value === 'string' && 
               value.includes('@shopify/hydrogen/react-router-types');
      }
      
      // Also check for comments
      const comments = ('leadingComments' in node && Array.isArray(node.leadingComments) ? node.leadingComments : []);
      return comments.some((comment: { value: string }) => 
        comment.value.includes('@shopify/hydrogen/react-router-types')
      );
    });
  }).length > 0;

  if (!hasHydrogenTypes) {
    // Add triple-slash directive at the top
    const directive = '/// <reference types="@shopify/hydrogen/react-router-types" />';
    const program = root.find(j.Program).get();
    
    // Create a comment node
    const comment = j.commentLine(directive);
    
    // Add as leading comment to the program
    if (!program.value.comments) {
      program.value.comments = [];
    }
    program.value.comments.unshift(comment);
    
    return true;
  }

  return false;
}