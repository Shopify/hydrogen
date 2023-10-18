import type {
  FunctionLikeDeclaration,
  JSDocableNode,
  VariableStatement,
} from 'ts-morph';

import {sanitizeType, getJsDocOrCreate} from './utils.js';

/**
 * Generate documentation for a function, storing it in functionNode or docNode
 */
export function generateFunctionDocumentation(
  functionNode: FunctionLikeDeclaration,
  variableStatement?: VariableStatement,
): void {
  const outputDocNode = getOutputJsDocNodeOrCreate(
    functionNode,
    variableStatement,
  );

  generateParameterDocumentation(functionNode, outputDocNode);

  // Add type annotation to exported functions
  // using the `export const foo: Foo = () => {}` syntax
  const jsDocs = variableStatement?.getJsDocs()[0];
  if (jsDocs?.getTags().length === 0) {
    const declaration = variableStatement?.getDeclarations()[0];
    const type = declaration?.getType().getText();
    if (type && type !== 'any' && type !== 'unknown') {
      if (type.startsWith('() => SerializeFrom<')) {
        // SerializeFrom type breaks for some reason. Replace it with a well-known type
        if (type.endsWith('.loader>')) {
          jsDocs.addTag({tagName: 'return', text: `{LoaderReturnData}`});
        }
      } else {
        jsDocs.addTag({tagName: 'type', text: `{${type}}`});
      }
    }
  }
}

/**
 * Generate @param documentation from function parameters for functionNode, storing it in docNode
 */
function generateParameterDocumentation(
  functionNode: FunctionLikeDeclaration,
  docNode: JSDocableNode,
): void {
  const params = functionNode.getParameters();

  // Get param tag that matches the param
  const jsDoc = getJsDocOrCreate(docNode);
  const paramTags = (jsDoc.getTags() || []).filter((tag) =>
    ['param', 'parameter'].includes(tag.getTagName()),
  );
  const commentLookup = Object.fromEntries(
    paramTags.map((tag) => [
      // @ts-ignore
      tag.compilerNode.name
        ?.getText()
        .replace(/\[|\]|(=.*)/g, '')
        .trim(),
      (tag.getComment() || '').toString().trim(),
    ]),
  );
  const preferredTagName = paramTags[0]?.getTagName();
  paramTags.forEach((tag) => tag.remove());

  for (const param of params) {
    const paramType = sanitizeType(param.getTypeNode()?.getText());
    if (!paramType) continue;

    const paramName = param.compilerNode.name?.getText();
    const isOptional = param.isOptional();
    const isRest = param.isRestParameter();

    // Rest parameters are arrays, but the JSDoc syntax is `...number` instead of `number[]`
    const paramTypeOut = isRest
      ? `...${paramType.replace(/\[\]\s*$/, '')}`
      : paramType;

    let defaultValue: string | undefined;
    if (isOptional) {
      const paramInitializer = param.getInitializer();
      defaultValue = paramInitializer
        ?.getText()
        .replaceAll(/(\s|\t)*\n(\s|\t)*/g, ' ');
    }

    let paramNameOut = paramName;
    // Skip parameter names if they are present in the type as an object literal
    // e.g. destructuring; { a }: { a: string }
    if (paramNameOut.match(/[{},]/)) paramNameOut = '';
    if (paramNameOut && isOptional) {
      // Wrap name in square brackets if the parameter is optional
      const defaultValueOut =
        defaultValue !== undefined ? `=${defaultValue}` : '';
      paramNameOut = `[${paramNameOut}${defaultValueOut}]`;
    }
    paramNameOut = paramNameOut ? ` ${paramNameOut}` : '';

    const comment = commentLookup[paramName.trim()];

    jsDoc.addTag({
      tagName: preferredTagName || 'param',
      text: `{${paramTypeOut}}${paramNameOut}${comment ? ` ${comment}` : ''}`,
    });
  }
}

/** Return the node most suitable for JSDoc for a function, adding JSDoc if there isn't any */
function getOutputJsDocNodeOrCreate(
  functionNode: FunctionLikeDeclaration,
  docNode?: JSDocableNode,
): JSDocableNode {
  if (docNode) {
    const funcNodeDocs = functionNode.getJsDocs();
    if (funcNodeDocs.length) return functionNode;
    getJsDocOrCreate(docNode);
    return docNode;
  }
  getJsDocOrCreate(functionNode);
  return functionNode;
}
