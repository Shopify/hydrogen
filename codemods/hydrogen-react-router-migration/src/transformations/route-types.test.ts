import { describe, test, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import { transformRouteTypes } from './route-types';
import type { ProjectLanguage } from '../detectors/language';

describe('Route Type Transformation', () => {
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
  
  describe('TypeScript Routes', () => {
    test('transforms loader with LoaderFunctionArgs', () => {
      const source = `
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader({context, params}: LoaderFunctionArgs) {
  return json({});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/products.$handle.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain("import type");
      expect(result).toContain("Route");
      expect(result).toContain("'./+types/products.$handle'");
      expect(result).toContain('Route.LoaderArgs');
      expect(result).not.toContain('LoaderFunctionArgs');
    });
    
    test('transforms action with ActionFunctionArgs', () => {
      const source = `
import {type ActionFunctionArgs} from '@remix-run/node';

export async function action({request}: ActionFunctionArgs) {
  return json({});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/account.orders.$id.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain("import type");
      expect(result).toContain("Route");
      expect(result).toContain("'./+types/account.orders.$id'");
      expect(result).toContain('Route.ActionArgs');
      expect(result).not.toContain('ActionFunctionArgs');
    });
    
    test('transforms meta function', () => {
      const source = `
import {type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: data.title}];
};

export async function loader() {
  return json({title: 'Test'});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/_index.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain("import type");
      expect(result).toContain("Route");
      expect(result).toContain("'./+types/_index'");
      expect(result).toContain('Route.MetaFunction');
      expect(result).not.toContain('MetaFunction<typeof loader>');
    });
    
    test('handles multiple type imports', () => {
      const source = `
import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';

export const meta: MetaFunction = ({data}) => [{title: 'Test'}];

export async function loader(args: LoaderFunctionArgs) {
  return json({});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/test.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain('import');
      expect(result).toContain('json');
      expect(result).toContain('useLoaderData');
      expect(result).not.toContain('LoaderFunctionArgs');
      expect(result).toContain('Route.LoaderArgs');
      expect(result).toContain('Route.MetaFunction');
    });
    
    test('does not add Route import if no route exports', () => {
      const source = `
import {json} from '@shopify/hydrogen';

export default function Component() {
  return <div>Hello</div>;
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/test.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(false);
      expect(root.toSource()).not.toContain('Route');
    });
    
    test('does not transform non-route files', () => {
      const source = `
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader(args: LoaderFunctionArgs) {
  return {};
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/lib/utils.ts', // Not a route file
        tsProject
      );
      
      expect(hasChanges).toBe(false);
    });
  });
  
  describe('JavaScript Routes', () => {
    test('adds JSDoc for loader function', () => {
      const source = `
import {json} from '@shopify/remix-oxygen';

export async function loader({context, params}) {
  return json({});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/products.$handle.js',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@typedef');
      expect(result).toContain("import('./+types/products.$handle').Route");
      expect(result).toContain('@param {Route.LoaderArgs}');
    });
    
    test('adds JSDoc for const arrow function', () => {
      const source = `
export const loader = async ({context}) => {
  return json({});
};`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/test.js',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@type {(args: Route.LoaderArgs) => Promise<Response>}');
    });
    
    test('adds JSDoc for meta export', () => {
      const source = `
export const meta = ({data}) => {
  return [{title: 'Test'}];
};

export async function loader() {
  return {title: 'Test'};
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/page.jsx',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@type {Route.MetaFunction}');
    });
    
    test('handles action function', () => {
      const source = `
export async function action({request}) {
  const formData = await request.formData();
  return json({success: true});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/contact.js',
        jsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(result).toContain('@param {Route.ActionArgs}');
    });
  });
  
  describe('Mixed Codebases', () => {
    test('handles JS file in TS project', () => {
      const source = `
export async function loader({context}) {
  return {data: 'test'};
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/legacy.js', // JS file in TS project
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource();
      // Should use JSDoc even though project is TS
      expect(result).toContain('@param {Route.LoaderArgs}');
      expect(result).not.toContain(': Route.LoaderArgs');
    });
  });
  
  describe('Special Route Names', () => {
    test('handles splat routes', () => {
      const source = `
export async function loader() {
  return json({});
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/$.tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain("import type");
      expect(result).toContain("Route");
      expect(result).toContain("'./+types/$'");
    });
    
    test('handles resource routes', () => {
      const source = `
export async function loader() {
  return new Response('sitemap content');
}`;
      
      const root = j(source);
      const hasChanges = transformRouteTypes(
        j, 
        root, 
        'app/routes/[sitemap.xml].tsx',
        tsProject
      );
      
      expect(hasChanges).toBe(true);
      const result = root.toSource({ quote: 'single' });
      expect(result).toContain("import type");
      expect(result).toContain("Route");
      expect(result).toContain("'./+types/[sitemap.xml]'");
    });
  });
});