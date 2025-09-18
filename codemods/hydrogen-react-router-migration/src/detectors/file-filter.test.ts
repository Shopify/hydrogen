import { describe, test, expect } from 'vitest';
import {
  shouldTransformFile,
  extractRouteName,
  getFileLanguage,
  isRouteFile,
  isContextFile,
  normalizeHydrogenRoute,
  analyzeFile
} from './file-filter';

describe('File Filter', () => {
  describe('shouldTransformFile', () => {
    test('excludes node_modules', () => {
      expect(shouldTransformFile('node_modules/package/index.ts')).toBe(false);
    });
    
    test('excludes dist and build directories', () => {
      expect(shouldTransformFile('dist/app.js')).toBe(false);
      expect(shouldTransformFile('build/index.js')).toBe(false);
    });
    
    test('excludes test files', () => {
      expect(shouldTransformFile('app/routes/product.test.tsx')).toBe(false);
      expect(shouldTransformFile('app/routes/product.spec.ts')).toBe(false);
      expect(shouldTransformFile('__tests__/product.tsx')).toBe(false);
    });
    
    test('excludes type definition files', () => {
      expect(shouldTransformFile('types.d.ts')).toBe(false);
      expect(shouldTransformFile('app/global.d.ts')).toBe(false);
    });
    
    test('includes app files', () => {
      expect(shouldTransformFile('app/routes/products.$handle.tsx')).toBe(true);
      expect(shouldTransformFile('app/lib/context.ts')).toBe(true);
      expect(shouldTransformFile('app/entry.server.tsx')).toBe(true);
    });
    
    test('respects language preferences', () => {
      const tsProject = { isTypeScript: true } as any;
      const jsProject = { isTypeScript: false } as any;
      
      expect(shouldTransformFile('app/routes/index.tsx', tsProject)).toBe(true);
      expect(shouldTransformFile('app/routes/index.jsx', jsProject)).toBe(true);
      expect(shouldTransformFile('app/routes/index.ts', jsProject)).toBe(false);
    });
  });
  
  describe('extractRouteName', () => {
    test('extracts standard route names', () => {
      expect(extractRouteName('app/routes/products.$handle.tsx'))
        .toBe('products.$handle');
      expect(extractRouteName('app/routes/_index.tsx'))
        .toBe('_index');
      expect(extractRouteName('app/routes/account.orders.$id.tsx'))
        .toBe('account.orders.$id');
    });
    
    test('handles nested routes with brackets', () => {
      expect(extractRouteName('app/routes/products/[handle].tsx'))
        .toBe('products.$handle');
      expect(extractRouteName('app/routes/account/orders/[id].tsx'))
        .toBe('account.orders.$id');
    });
    
    test('handles flat routes with dashes', () => {
      expect(extractRouteName('app/routes/products-$handle.tsx'))
        .toBe('products.$handle');
      expect(extractRouteName('app/routes/account-orders-$id.tsx'))
        .toBe('account.orders.$id');
    });
    
    test('handles special route files', () => {
      expect(extractRouteName('app/routes/[sitemap.xml].tsx'))
        .toBe('[sitemap.xml]');
      expect(extractRouteName('app/routes/[robots.txt].tsx'))
        .toBe('[robots.txt]');
    });
    
    test('returns null for non-route files', () => {
      expect(extractRouteName('app/lib/utils.ts')).toBe(null);
      expect(extractRouteName('app/components/Header.tsx')).toBe(null);
    });
  });
  
  describe('getFileLanguage', () => {
    test('identifies TypeScript files', () => {
      expect(getFileLanguage('file.ts')).toBe('typescript');
      expect(getFileLanguage('component.tsx')).toBe('typescript');
    });
    
    test('identifies JavaScript files', () => {
      expect(getFileLanguage('file.js')).toBe('javascript');
      expect(getFileLanguage('component.jsx')).toBe('javascript');
    });
  });
  
  describe('isRouteFile', () => {
    test('identifies route files', () => {
      expect(isRouteFile('app/routes/index.tsx')).toBe(true);
      expect(isRouteFile('app/routes/products.$handle.tsx')).toBe(true);
    });
    
    test('rejects non-route files', () => {
      expect(isRouteFile('app/lib/utils.ts')).toBe(false);
      expect(isRouteFile('app/components/Header.tsx')).toBe(false);
    });
  });
  
  describe('isContextFile', () => {
    test('identifies context files', () => {
      expect(isContextFile('app/lib/context.ts')).toBe(true);
      expect(isContextFile('app/server.ts')).toBe(true);
      expect(isContextFile('app/entry.server.tsx')).toBe(true);
    });
    
    test('rejects non-context files', () => {
      expect(isContextFile('app/routes/index.tsx')).toBe(false);
      expect(isContextFile('app/lib/utils.ts')).toBe(false);
    });
  });
  
  describe('normalizeHydrogenRoute', () => {
    test('preserves special routes', () => {
      expect(normalizeHydrogenRoute('[robots.txt]')).toBe('[robots.txt]');
      expect(normalizeHydrogenRoute('[sitemap.xml]')).toBe('[sitemap.xml]');
    });
    
    test('preserves standard routes', () => {
      expect(normalizeHydrogenRoute('products.$handle')).toBe('products.$handle');
      expect(normalizeHydrogenRoute('account.orders.$id')).toBe('account.orders.$id');
    });
    
    test('preserves splat routes', () => {
      expect(normalizeHydrogenRoute('$')).toBe('$');
    });
  });
  
  describe('analyzeFile', () => {
    test('provides complete file analysis', () => {
      const analysis = analyzeFile('app/routes/products.$handle.tsx');
      
      expect(analysis.path).toBe('app/routes/products.$handle.tsx');
      expect(analysis.language).toBe('typescript');
      expect(analysis.isRoute).toBe(true);
      expect(analysis.routeName).toBe('products.$handle');
      expect(analysis.isContext).toBe(false);
      expect(analysis.isConfig).toBe(false);
      expect(analysis.shouldTransform).toBe(true);
    });
    
    test('analyzes context files', () => {
      const analysis = analyzeFile('app/lib/context.ts');
      
      expect(analysis.isRoute).toBe(false);
      expect(analysis.isContext).toBe(true);
      expect(analysis.shouldTransform).toBe(true);
    });
    
    test('analyzes config files', () => {
      const analysis = analyzeFile('vite.config.ts');
      
      expect(analysis.isConfig).toBe(true);
      expect(analysis.shouldTransform).toBe(false);
    });
  });
});