import { describe, test, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import { transformComponents, addEnvironmentTypeReference } from './components';
import type { ProjectLanguage } from '../detectors/language';

describe('Component Transformations', () => {
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

  describe('Component renames', () => {
    test('transforms RemixServer to ServerRouter in imports', () => {
      const source = `
import { RemixServer } from 'react-router';

export default function handleRequest() {
  return <RemixServer />;
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/entry.server.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('import { ServerRouter } from');
      expect(result).toContain('<ServerRouter />');
      expect(result).not.toContain('RemixServer');
    });

    test('transforms RemixBrowser to HydratedRouter', () => {
      const source = `
import { RemixBrowser } from 'react-router';

hydrateRoot(
  document,
  <RemixBrowser />
);`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/entry.client.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('import { HydratedRouter } from');
      expect(result).toContain('<HydratedRouter />');
      expect(result).not.toContain('RemixBrowser');
    });

    test('handles component with props', () => {
      const source = `
import { RemixServer } from 'react-router';

export default function handleRequest(request, statusCode) {
  return (
    <RemixServer 
      context={remixContext}
      url={request.url}
    />
  );
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/entry.server.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('<ServerRouter');
      expect(result).toContain('context={remixContext}');
      expect(result).not.toContain('RemixServer');
    });

    test('handles component references in code', () => {
      const source = `
import { RemixServer } from 'react-router';

const Server = RemixServer;
const element = React.createElement(RemixServer, props);`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/entry.server.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('const Server = ServerRouter');
      expect(result).toContain('React.createElement(ServerRouter');
    });
  });

  describe('Oxygen imports', () => {
    test('transforms @shopify/remix-oxygen imports', () => {
      const source = `
import { createRequestHandler } from '@shopify/remix-oxygen';
import { getSession } from '@shopify/remix-oxygen';`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'server.ts', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("from '@shopify/hydrogen/oxygen'");
      expect(result).not.toContain('@shopify/remix-oxygen');
    });

    test('transforms dynamic oxygen imports', () => {
      const source = `
const handler = await import('@shopify/remix-oxygen');`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'server.ts', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain("import('@shopify/hydrogen/oxygen')");
      expect(result).not.toContain('@shopify/remix-oxygen');
    });
  });

  describe('Virtual module paths', () => {
    test('transforms virtual:remix/server-build', () => {
      const source = `
import * as build from 'virtual:remix/server-build';

export const serverBuild = build;`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'server.ts', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('virtual:react-router/server-build');
      expect(result).not.toContain('virtual:remix/server-build');
    });

    test('transforms virtual modules in dynamic imports', () => {
      const source = `
const build = await import('virtual:remix/server-build');`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'server.ts', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('virtual:react-router/server-build');
    });
  });

  describe('Error type annotations', () => {
    test('adds type annotation to catch clause in TypeScript', () => {
      const source = `
try {
  await doSomething();
} catch (error) {
  console.error(error);
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(true);
      expect(result).toContain('catch (error: unknown)');
    });

    test('does not add type annotation in JavaScript', () => {
      const source = `
try {
  await doSomething();
} catch (error) {
  console.error(error);
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/routes/test.js', jsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(false);
      expect(result).toContain('catch (error)');
      expect(result).not.toContain('unknown');
    });

    test('preserves existing type annotation', () => {
      const source = `
try {
  await doSomething();
} catch (error: Error) {
  console.error(error.message);
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(false);
      expect(result).toContain('catch (error: Error)');
    });

    test('handles catch without parameter', () => {
      const source = `
try {
  await doSomething();
} catch {
  console.error('Something went wrong');
}`;

      const root = j(source);
      const hasChanges = transformComponents(j, root, 'app/routes/test.tsx', tsProject);
      const result = root.toSource({ quote: 'single' });

      expect(hasChanges).toBe(false);
      expect(result).toContain('} catch {');
    });
  });

  describe('Environment type references', () => {
    test('adds type reference to env.d.ts', () => {
      const source = `
declare global {
  const env: Env;
}`;

      const root = j(source);
      const hasChanges = addEnvironmentTypeReference(j, root, 'app/env.d.ts');

      expect(hasChanges).toBe(true);
      const result = root.toSource();
      expect(root.find(j.Program).get().value.comments).toBeDefined();
      expect(root.find(j.Program).get().value.comments[0].value).toContain('@shopify/hydrogen/react-router-types');
    });

    test('does not add duplicate type reference', () => {
      const source = `
/// <reference types="@shopify/hydrogen/react-router-types" />

declare global {
  const env: Env;
}`;

      const root = j(source);
      // First we need to parse the comment as a directive
      const program = root.find(j.Program).get();
      program.value.comments = [
        j.commentLine('// <reference types="@shopify/hydrogen/react-router-types" />')
      ];
      
      const hasChanges = addEnvironmentTypeReference(j, root, 'app/env.d.ts');

      expect(hasChanges).toBe(false);
    });

    test('does not add to non-env files', () => {
      const source = `
export function loader() {
  return json({});
}`;

      const root = j(source);
      const hasChanges = addEnvironmentTypeReference(j, root, 'app/routes/index.tsx');

      expect(hasChanges).toBe(false);
    });
  });
});