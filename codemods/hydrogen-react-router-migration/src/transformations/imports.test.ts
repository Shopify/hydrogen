import { describe, test, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import { transformImports } from './imports';
import type { ProjectLanguage } from '../detectors/language';

describe('Import Transformations', () => {
  const j = jscodeshift.withParser('tsx');
  
  const tsProject: ProjectLanguage = {
    isTypeScript: true,
    hasTypeScriptDependency: true,
    hasTsConfig: true,
    fileExtensions: { primary: '.ts', component: '.tsx' },
    routeFilePattern: '**/*.{ts,tsx}',
    majorityLanguage: 'typescript'
  };

  describe('Hydrogen imports', () => {
    test('transforms json to data from @shopify/hydrogen', () => {
      const source = `
import { json, redirect } from '@shopify/hydrogen';

export async function loader() {
  return json({ hello: 'world' });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { data, redirect } from 'react-router'");
      expect(result).toContain('return data({ hello:');
      expect(result).not.toContain('@shopify/hydrogen');
      expect(result).not.toContain('json(');
    });

    test('removes defer from imports and transforms usage', () => {
      const source = `
import { defer, json } from '@shopify/hydrogen';

export async function loader() {
  return defer({ promise: fetchData() });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { data } from 'react-router'");
      expect(result).not.toContain('defer');
      expect(result).toContain('return data({ promise: fetchData() })');
    });

    test('preserves Hydrogen-specific exports', () => {
      const source = `
import { json, CartForm, Seo } from '@shopify/hydrogen';

export async function loader() {
  return json({ data: true });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { CartForm, Seo } from '@shopify/hydrogen'");
      expect(result).toContain("import { data } from 'react-router'");
      expect(result).toContain('return data({ data: true })');
    });

    test('handles mixed imports correctly', () => {
      const source = `
import { Link, NavLink, Analytics, Money } from '@shopify/hydrogen';`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { Analytics, Money } from '@shopify/hydrogen'");
      expect(result).toContain("import { Link, NavLink } from 'react-router'");
    });
  });

  describe('Remix imports', () => {
    test('transforms @remix-run/react imports', () => {
      const source = `
import { Link, useLoaderData, json } from '@remix-run/react';

export async function loader() {
  return json({ test: true });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { Link, useLoaderData, data } from 'react-router'");
      expect(result).not.toContain('@remix-run/react');
      expect(result).toContain('return data({ test: true })');
    });

    test('transforms @remix-run/node imports', () => {
      const source = `
import { json, redirect } from '@remix-run/node';`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { data, redirect } from 'react-router'");
      expect(result).not.toContain('@remix-run/node');
    });

    test('removes defer from @remix-run imports', () => {
      const source = `
import { defer, redirect } from '@remix-run/server-runtime';

export function loader() {
  return defer({ data: Promise.resolve(1) });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { redirect } from 'react-router'");
      expect(result).not.toContain('defer');
      expect(result).toContain('return data({ data: Promise.resolve(1) })');
    });
  });

  describe('Import deduplication', () => {
    test('merges duplicate react-router imports', () => {
      const source = `
import { json } from '@shopify/hydrogen';
import { Link } from '@remix-run/react';
import { redirect } from '@remix-run/node';`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      
      const importMatches = result.match(/import .* from 'react-router'/g);
      expect(importMatches).toHaveLength(1);
      expect(result).toContain("import { data, Link, redirect } from 'react-router'");
    });

    test('handles existing react-router imports', () => {
      const source = `
import { Outlet } from 'react-router';
import { json, Link } from '@shopify/hydrogen';`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      
      const importMatches = result.match(/import .* from 'react-router'/g);
      expect(importMatches).toHaveLength(1);
      expect(result).toContain('Outlet');
      expect(result).toContain('data');
      expect(result).toContain('Link');
    });
  });

  describe('Edge cases', () => {
    test('handles aliased imports', () => {
      const source = `
import { json as jsonResponse } from '@shopify/hydrogen';

export function loader() {
  return jsonResponse({ ok: true });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import { data as jsonResponse } from 'react-router'");
      expect(result).toContain('return jsonResponse({ ok: true })');
    });

    test('handles type imports', () => {
      const source = `
import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import type { LoaderArgs } from 'react-router'");
      expect(result).toContain("import { data } from 'react-router'");
    });

    test('handles empty imports after removal', () => {
      const source = `
import { defer } from '@shopify/hydrogen';

export function loader() {
  return defer({ test: 1 });
}`;

      const root = j(source);
      const hasChanges = transformImports(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).not.toContain("import { defer }");
      expect(result).not.toContain('@shopify/hydrogen');
      expect(result).toContain('return data({ test: 1 })');
    });
  });
});