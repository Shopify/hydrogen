import { describe, test, expect, beforeEach } from 'vitest';
import jscodeshift from 'jscodeshift';
import { JavaScriptStrategy } from './javascript';

describe('JavaScript Strategy', () => {
  const j = jscodeshift;
  let strategy: JavaScriptStrategy;
  
  beforeEach(() => {
    strategy = new JavaScriptStrategy(j);
  });
  
  describe('addRouteTypeImport', () => {
    test('adds JSDoc typedef comment', () => {
      const source = `
import { json } from '@shopify/hydrogen';

export async function loader() {}
`;
      const root = j(source);
      const hasChanges = strategy.addRouteTypeImport(root, 'products.$handle');
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@typedef');
      expect(result).toContain("import('./+types/products.$handle').Route");
    });
    
    test('does not add duplicate typedef', () => {
      const source = `
/**
 * @typedef {import('./+types/products.$handle').Route} Route
 */
import { json } from '@shopify/hydrogen';

export async function loader() {}
`;
      const root = j(source);
      
      // Add the comment to simulate it already exists
      const program = root.find(j.Program).get();
      program.value.comments = [
        j.commentBlock(`*
 * @typedef {import('./+types/products.$handle').Route} Route
 */`)
      ];
      
      const hasChanges = strategy.addRouteTypeImport(root, 'products.$handle');
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('transformLoaderType', () => {
    test('adds JSDoc comment to loader function', () => {
      const source = `
export async function loader({context, params}) {
  return json({});
}`;
      const root = j(source);
      const hasChanges = strategy.transformLoaderType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@param {Route.LoaderArgs}');
      expect(result).toContain('@returns {Promise<Response>}');
    });
    
    test('adds JSDoc to const loader arrow function', () => {
      const source = `
export const loader = async ({context, params}) => {
  return json({});
};`;
      const root = j(source);
      const hasChanges = strategy.transformLoaderType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@type {(args: Route.LoaderArgs) => Promise<Response>}');
    });
    
    test('does not add duplicate JSDoc', () => {
      const source = `
/**
 * @param {Route.LoaderArgs} args
 * @returns {Promise<Response>}
 */
export async function loader({context, params}) {
  return json({});
}`;
      const root = j(source);
      
      // Add existing comment
      const loaderFunc = root.find(j.FunctionDeclaration, { id: { name: 'loader' } }).get();
      loaderFunc.value.leadingComments = [
        j.commentBlock(`*
 * @param {Route.LoaderArgs} args
 * @returns {Promise<Response>}
 */`)
      ];
      
      const hasChanges = strategy.transformLoaderType(root);
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('transformActionType', () => {
    test('adds JSDoc comment to action function', () => {
      const source = `
export async function action({request}) {
  return json({});
}`;
      const root = j(source);
      const hasChanges = strategy.transformActionType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@param {Route.ActionArgs}');
      expect(result).toContain('@returns {Promise<Response>}');
    });
    
    test('adds JSDoc to const action', () => {
      const source = `
export const action = async ({request}) => {
  return json({});
};`;
      const root = j(source);
      const hasChanges = strategy.transformActionType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@type {(args: Route.ActionArgs) => Promise<Response>}');
    });
  });
  
  describe('transformMetaType', () => {
    test('adds JSDoc comment to meta export', () => {
      const source = `
export const meta = ({data}) => {
  return [{title: 'Test'}];
};`;
      const root = j(source);
      const hasChanges = strategy.transformMetaType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@type {Route.MetaFunction}');
    });
    
    test('does not add duplicate JSDoc to meta', () => {
      const source = `
/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: 'Test'}];
};`;
      const root = j(source);
      
      // Add existing comment
      const metaVar = root.find(j.VariableDeclarator, { id: { name: 'meta' } }).at(0);
      if (metaVar.length > 0) {
        const parent = metaVar.get().parent.value;
        parent.leadingComments = [
          j.commentBlock(`*
 * @type {Route.MetaFunction}
 */`)
        ];
      }
      
      const hasChanges = strategy.transformMetaType(root);
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('addErrorTypeAnnotation', () => {
    test('adds JSDoc comment for error in catch clause', () => {
      const source = `
try {
  doSomething();
} catch (error) {
  console.error(error);
}`;
      const root = j(source);
      const hasChanges = strategy.addErrorTypeAnnotation(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@param {Error}');
    });
    
    test('does not add duplicate error annotation', () => {
      const source = `
try {
  doSomething();
} catch (error) {
  // @param {Error} error
  console.error(error);
}`;
      const root = j(source);
      
      // Find catch clause and add comment
      const catchClause = root.find(j.CatchClause).at(0);
      if (catchClause.length > 0) {
        const catchBlock = catchClause.get().parent.value;
        if (catchBlock.handler) {
          catchBlock.handler.leadingComments = [
            j.commentLine(' @param {Error} error')
          ];
        }
      }
      
      const hasChanges = strategy.addErrorTypeAnnotation(root);
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('addContextTypeDefinition', () => {
    test('adds JSDoc typedef for additional context', () => {
      const source = `
export function createContext() {
  return {};
}`;
      const root = j(source);
      
      const properties = [
        { type: 'Property', key: { type: 'Identifier', name: 'session' } },
        { type: 'Property', key: { type: 'Identifier', name: 'cart' } }
      ];
      
      strategy.addContextTypeDefinition(root, properties);
      
      const result = root.toSource();
      expect(result).toContain('@typedef {Object} AdditionalContext');
      expect(result).toContain('@property {*} session');
      expect(result).toContain('@property {*} cart');
    });
  });
});