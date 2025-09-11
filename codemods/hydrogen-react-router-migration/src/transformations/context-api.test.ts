import { describe, test, expect, beforeEach } from 'vitest';
import jscodeshift from 'jscodeshift';
import { transformContextAPI } from './context-api';
import type { ProjectLanguage } from '../detectors/language';

describe('Context API Transformation', () => {
  const j = jscodeshift.withParser('tsx');
  
  const tsProject: ProjectLanguage = {
    isTypeScript: true,
    hasTypeScriptDependency: true,
    hasTsConfig: true,
    fileExtensions: { primary: '.ts', component: '.tsx' },
    routeFilePattern: '**/*.{ts,tsx}',
    majorityLanguage: 'typescript'
  };
  
  const jsProject: ProjectLanguage = {
    isTypeScript: false,
    hasTypeScriptDependency: false,
    hasTsConfig: false,
    fileExtensions: { primary: '.js', component: '.jsx' },
    routeFilePattern: '**/*.{js,jsx}',
    majorityLanguage: 'javascript'
  };
  
  describe('TypeScript Context Files', () => {
    test('renames createAppLoadContext to createHydrogenRouterContext', () => {
      const source = `
export function createAppLoadContext(request: Request, env: Env, ctx: ExecutionContext) {
  const hydrogenContext = createHydrogenContext({request, env, ctx});
  return hydrogenContext;
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.ts',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('createHydrogenRouterContext');
      expect(result).not.toContain('createAppLoadContext');
    });
    
    test('extracts custom context properties', () => {
      const source = `
export function createAppLoadContext(request: Request, env: Env, ctx: ExecutionContext) {
  const hydrogenContext = createHydrogenContext({request, env, ctx});
  return {
    ...hydrogenContext,
    customProp: 'value',
    anotherProp: 123
  };
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.ts',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('additionalContext');
      expect(result).toContain("customProp: 'value'");
      expect(result).toContain('anotherProp: 123');
      expect(result).toContain('namespace ReactRouter');
      expect(result).toContain('interface AppLoadContext');
    });
    
    test('handles const arrow function', () => {
      const source = `
export const createAppLoadContext = (request: Request, env: Env) => {
  const context = createHydrogenContext({request, env});
  return context;
};`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/server.ts',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('createHydrogenRouterContext');
      expect(result).not.toContain('createAppLoadContext');
    });
  });
  
  describe('JavaScript Context Files', () => {
    test('renames createAppLoadContext in JavaScript', () => {
      const source = `
export function createAppLoadContext(request, env, ctx) {
  const hydrogenContext = createHydrogenContext({request, env, ctx});
  return hydrogenContext;
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.js',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('createHydrogenRouterContext');
      expect(result).not.toContain('createAppLoadContext');
    });
    
    test('extracts custom properties with JSDoc', () => {
      const source = `
export function createAppLoadContext(request, env) {
  const hydrogenContext = createHydrogenContext({request, env});
  return {
    ...hydrogenContext,
    customProp: 'value',
    anotherProp: 123
  };
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.js',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('additionalContext');
      expect(result).toContain('@typedef {Object} AdditionalContext');
      expect(result).toContain('@property {*} customProp');
      expect(result).toContain('@property {*} anotherProp');
    });
  });
  
  describe('Context Usage', () => {
    test('updates storefront.i18n to customerAccount.i18n', () => {
      const source = `
export async function loader({context}) {
  const language = context.storefront.i18n.language;
  const country = context.storefront.i18n.country;
  return json({language, country});
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/routes/products.$handle.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('context.customerAccount.i18n.language');
      expect(result).toContain('context.customerAccount.i18n.country');
      expect(result).not.toContain('context.storefront.i18n');
    });
    
    test('handles nested i18n access', () => {
      const source = `
const {language, country} = context.storefront.i18n;
const lang = context.storefront.i18n.language;`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/routes/test.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('context.customerAccount.i18n');
      expect(result).not.toContain('context.storefront.i18n');
    });
    
    test('does not transform non-context files without context usage', () => {
      const source = `
export function Component() {
  return <div>Hello</div>;
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/components/Test.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('Edge Cases', () => {
    test('handles empty context function', () => {
      const source = `
export function createAppLoadContext() {
  return {};
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.ts',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('createHydrogenRouterContext');
    });
    
    test('handles context with only spread', () => {
      const source = `
export function createAppLoadContext(request, env) {
  const ctx = createContext({request, env});
  return {...ctx};
}`;
      
      const root = j(source);
      const hasChanges = transformContextAPI(
        j, 
        root, 
        'app/lib/context.ts',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('createHydrogenRouterContext');
      expect(result).not.toContain('additionalContext'); // No additional props
    });
  });
});