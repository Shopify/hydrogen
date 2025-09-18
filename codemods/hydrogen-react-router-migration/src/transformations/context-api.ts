import type { Collection, JSCodeshift, TSPropertySignature } from 'jscodeshift';
import type { ProjectLanguage } from '../detectors/language';

export function transformContextAPI(
  j: JSCodeshift,
  root: Collection,
  filePath: string,
  language: ProjectLanguage
): boolean {
  let hasChanges = false;
  
  // Check if this is a context file
  const isContextFile = filePath.includes('lib/context') || 
                       filePath.includes('server.') ||
                       filePath.includes('entry.server');
  
  if (!isContextFile) {
    // Transform context usage in other files
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
               (p.argument.name === 'hydrogenContext' || 
                p.argument.name.includes('context'))
        );
        
        if (hasSpread) {
          // Extract additional properties (filter out spread elements)
          const additionalProps = returnArg.properties.filter(
            (p: any) => p.type === 'Property' || p.type === 'ObjectProperty'
          );
          
          if (additionalProps.length > 0) {
            // Create additionalContext variable
            if (language.isTypeScript) {
              hasChanges = createTypeScriptContext(j, returnPath, additionalProps, root) || hasChanges;
            } else {
              hasChanges = createJavaScriptContext(j, returnPath, additionalProps, root) || hasChanges;
            }
          }
        }
      }
    });
  });
  
  // Update all references to createAppLoadContext
  root.find(j.Identifier, { name: 'createAppLoadContext' })
    .forEach(path => {
      if (path.parent.value.type !== 'FunctionDeclaration' && 
          path.parent.value.type !== 'VariableDeclarator') {
        path.value.name = 'createHydrogenRouterContext';
        hasChanges = true;
      }
    });
  
  return hasChanges;
}

function createTypeScriptContext(
  j: JSCodeshift,
  returnPath: any,
  additionalProps: any[],
  root: Collection
): boolean {
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
  
  // Insert before return
  j(returnPath).insertBefore(additionalContext);
  
  // Create type augmentation
  const typeAugmentation = createTypeAugmentation(j, additionalProps);
  
  // Find the best place to insert type augmentation
  const lastImport = root.find(j.ImportDeclaration).at(-1);
  if (lastImport.length > 0) {
    lastImport.insertAfter(typeAugmentation);
  } else {
    root.get().node.program.body.unshift(typeAugmentation);
  }
  
  // Update return to use merged context
  returnPath.value.argument = j.callExpression(
    j.memberExpression(
      j.identifier('Object'),
      j.identifier('assign')
    ),
    [
      j.objectExpression([]),
      j.spreadElement(j.identifier('hydrogenContext')),
      j.identifier('additionalContext')
    ]
  );
  
  return true;
}

function createJavaScriptContext(
  j: JSCodeshift,
  returnPath: any,
  additionalProps: any[],
  root: Collection
): boolean {
  // Create additionalContext const
  const additionalContext = j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier('additionalContext'),
      j.objectExpression(additionalProps)
    )
  ]);
  
  // Insert before return
  j(returnPath).insertBefore(additionalContext);
  
  // Add JSDoc typedef for additionalContext
  const jsDocTypedef = createJSDocTypedef(j, additionalProps);
  
  // Insert JSDoc at the top of the file
  const program = root.find(j.Program).get();
  const firstNode = program.value.body[0];
  if (firstNode) {
    const newSource = `${jsDocTypedef}\n${root.toSource()}`;
    const newRoot = j(newSource);
    program.value.body = newRoot.find(j.Program).get().value.body;
  }
  
  // Update return to use merged context
  returnPath.value.argument = j.objectExpression([
    j.spreadElement(j.identifier('hydrogenContext')),
    j.spreadElement(j.identifier('additionalContext'))
  ]);
  
  return true;
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
  }).filter((prop): prop is TSPropertySignature => prop !== null);
  
  const moduleDecl = j.tsModuleDeclaration(
    j.identifier('ReactRouter'),
    j.tsModuleBlock([
      j.tsInterfaceDeclaration(
        j.identifier('AppLoadContext'),
        j.tsInterfaceBody(interfaceProperties)
      )
    ])
  );
  
  // Set declare flag to make it a module augmentation
  moduleDecl.declare = true;
  
  return moduleDecl;
}

function createJSDocTypedef(j: JSCodeshift, properties: any[]): string {
  const propDefs = properties.map(prop => {
    if (prop.type === 'Property' && prop.key?.type === 'Identifier') {
      return ` * @property {*} ${prop.key.name}`;
    } else if (prop.type === 'ObjectProperty' && prop.key?.type === 'Identifier') {
      return ` * @property {*} ${prop.key.name}`;
    }
    return null;
  }).filter(Boolean).join('\n');
  
  if (!propDefs) {
    return `/**
 * @typedef {Object} AdditionalContext
 */`;
  }
  
  return `/**
 * @typedef {Object} AdditionalContext
${propDefs}
 */`;
}

function transformContextConst(
  j: JSCodeshift,
  root: Collection,
  contextConst: Collection
): boolean {
  let hasChanges = false;
  
  contextConst.forEach(path => {
    // Rename the const
    if (path.value.id.name === 'createAppLoadContext') {
      path.value.id.name = 'createHydrogenRouterContext';
      hasChanges = true;
    }
  });
  
  return hasChanges;
}

function transformContextUsage(j: JSCodeshift, root: Collection): boolean {
  let hasChanges = false;
  
  // Update context.storefront.i18n references to context.customerAccount.i18n
  root.find(j.MemberExpression).forEach(path => {
    const node = path.value;
    if (isStorefrontI18nAccess(node)) {
      // Change storefront to customerAccount
      const storefrontAccess = findStorefrontAccess(node);
      if (storefrontAccess) {
        storefrontAccess.property.name = 'customerAccount';
        hasChanges = true;
      }
    }
  });
  
  // Update HydrogenContext type references if they exist
  root.find(j.TSTypeReference, {
    typeName: { name: 'AppLoadContext' }
  }).forEach(path => {
    // Keep AppLoadContext as it's now augmented
    // No changes needed here
  });
  
  return hasChanges;
}

function isStorefrontI18nAccess(node: any): boolean {
  // Check if this is accessing context.storefront.i18n
  if (node.property?.name === 'i18n' && 
      node.object?.type === 'MemberExpression' &&
      node.object.property?.name === 'storefront') {
    return true;
  }
  
  // Check deeper nesting like context.storefront.i18n.language
  if (node.object?.type === 'MemberExpression') {
    return isStorefrontI18nAccess(node.object);
  }
  
  return false;
}

function findStorefrontAccess(node: any): any {
  if (node.property?.name === 'storefront') {
    return node;
  }
  
  if (node.object?.type === 'MemberExpression') {
    return findStorefrontAccess(node.object);
  }
  
  return null;
}