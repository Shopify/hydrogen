import { describe, test, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import { TypeScriptStrategy } from './typescript';

describe('TypeScript Strategy', () => {
  const j = jscodeshift;
  let strategy: TypeScriptStrategy;
  
  beforeEach(() => {
    strategy = new TypeScriptStrategy(j);
  });
  
  describe('addRouteTypeImport', () => {
    test('adds type import when not present', () => {
      const source = `
import { json } from '@shopify/hydrogen';

export async function loader() {}
`;
      const root = j(source);
      const hasChanges = strategy.addRouteTypeImport(root, 'products.$handle');
      
      expect(hasChanges).toBe(true);
      expect(root.toSource()).toContain("import type {Route} from './+types/products.$handle';");
    });
    
    test('does not add duplicate import', () => {
      const source = `
import type {Route} from './+types/products.$handle';
import { json } from '@shopify/hydrogen';

export async function loader() {}
`;
      const root = j(source);
      const hasChanges = strategy.addRouteTypeImport(root, 'products.$handle');
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('transformLoaderType', () => {
    test('transforms LoaderFunctionArgs to Route.LoaderArgs', () => {
      const source = `
export async function loader(args: LoaderFunctionArgs) {
  return {};
}`;
      const root = j(source);
      const hasChanges = strategy.transformLoaderType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('Route.LoaderArgs');
      expect(result).not.toContain('LoaderFunctionArgs');
    });
    
    test('returns false when no loader types to transform', () => {
      const source = `
export async function loader(args: any) {
  return {};
}`;
      const root = j(source);
      const hasChanges = strategy.transformLoaderType(root);
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('transformActionType', () => {
    test('transforms ActionFunctionArgs to Route.ActionArgs', () => {
      const source = `
export async function action(args: ActionFunctionArgs) {
  return {};
}`;
      const root = j(source);
      const hasChanges = strategy.transformActionType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('Route.ActionArgs');
      expect(result).not.toContain('ActionFunctionArgs');
    });
  });
  
  describe('transformMetaType', () => {
    test('transforms MetaFunction to Route.MetaFunction', () => {
      const source = `
export const meta: MetaFunction = ({data}) => {
  return [{title: 'Test'}];
};`;
      const root = j(source);
      const hasChanges = strategy.transformMetaType(root);
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('Route.MetaFunction');
    });
    
    test('transforms variable declarator with MetaFunction type', () => {
      const source = `
const meta: MetaFunction = ({data}) => {
  return [{title: data.title}];
};
export { meta };`;
      const root = j(source);
      const hasChanges = strategy.transformMetaType(root);
      
      expect(hasChanges).toBe(true);
      expect(root.toSource()).toContain('Route.MetaFunction');
    });
  });
  
  describe('addErrorTypeAnnotation', () => {
    test('adds Error type annotation to catch clauses', () => {
      const source = `
try {
  doSomething();
} catch (error) {
  console.error(error);
}`;
      const root = j(source);
      const hasChanges = strategy.addErrorTypeAnnotation(root);
      
      expect(hasChanges).toBe(true);
      expect(root.toSource()).toContain('catch (error: Error)');
    });
    
    test('does not add annotation if already present', () => {
      const source = `
try {
  doSomething();
} catch (error: Error) {
  console.error(error);
}`;
      const root = j(source);
      const hasChanges = strategy.addErrorTypeAnnotation(root);
      
      expect(hasChanges).toBe(false);
    });
  });
});