import { describe, test, expect } from 'vitest';
import jscodeshift from 'jscodeshift';
import transformer from './index';

function runTransform(source: string, path: string = 'test.tsx'): string | undefined {
  const fileInfo = {
    path,
    source
  };
  
  const api = {
    jscodeshift,
    stats: () => {},
    report: () => {}
  };
  
  const options = {
    skipReactRouterCheck: true,
    skipGitCheck: true
  };
  
  return transformer(fileInfo, api, options);
}

describe('Basic Transformer', () => {
  test('skips node_modules files', () => {
    const source = `export function createAppLoadContext() {}`;
    const result = runTransform(source, 'node_modules/test.ts');
    expect(result).toBeUndefined();
  });

  test('skips .d.ts files', () => {
    const source = `export function createAppLoadContext() {}`;
    const result = runTransform(source, 'types.d.ts');
    expect(result).toBeUndefined();
  });

  test('processes TypeScript files', () => {
    const source = `export function test() {}`;
    const result = runTransform(source, 'app/test.ts');
    // Should return undefined if no changes, which is expected for this test
    expect(result).toBeUndefined();
  });

  test('processes TSX files', () => {
    const source = `export function Component() { return <div />; }`;
    const result = runTransform(source, 'app/component.tsx');
    expect(result).toBeUndefined();
  });

  test('basic transformation works', () => {
    const source = `
function createAppLoadContext() { return {}; }
const context = createAppLoadContext();
export { createAppLoadContext };
`;
    const result = runTransform(source, 'app/lib/context.ts');
    
    // The basic transformer should rename createAppLoadContext references
    expect(result).toContain('createHydrogenRouterContext');
    expect(result).not.toContain('const context = createAppLoadContext');
  });

  test('transforms function declarations in context files', () => {
    const source = `export function createAppLoadContext() { return {}; }`;
    const result = runTransform(source, 'app/lib/context.ts');
    
    // With context API transformation, function declarations are renamed
    expect(result).toContain('createHydrogenRouterContext');
    expect(result).not.toContain('createAppLoadContext');
  });

  test('transforms imports from @shopify/hydrogen', () => {
    const source = `
import { json, redirect } from '@shopify/hydrogen';

export async function loader() {
  return json({ test: true });
}`;
    const result = runTransform(source, 'app/routes/test.tsx');
    
    expect(result).toContain("import { data, redirect } from 'react-router'");
    expect(result).toContain('return data({ test: true })');
    expect(result).not.toContain('@shopify/hydrogen');
    expect(result).not.toContain('json(');
  });

  test('handles mixed Hydrogen and React Router imports', () => {
    const source = `
import { json, Analytics, Money } from '@shopify/hydrogen';

export function loader() {
  return json({ test: true });
}

export function Component() {
  return <Money />;
}`;
    const result = runTransform(source, 'app/routes/test.tsx');
    
    expect(result).toContain("import { Analytics, Money } from '@shopify/hydrogen'");
    expect(result).toContain("import { data } from 'react-router'");
    expect(result).toContain('return data({ test: true })');
  });

  test('transforms component names', () => {
    const source = `
import { RemixServer } from 'react-router';

export default function handleRequest() {
  return <RemixServer />;
}`;
    const result = runTransform(source, 'app/entry.server.tsx');
    
    expect(result).toContain('import { ServerRouter } from');
    expect(result).toContain('<ServerRouter />');
    expect(result).not.toContain('RemixServer');
  });

  test('transforms oxygen imports', () => {
    const source = `
import { createRequestHandler } from '@shopify/remix-oxygen';

export default createRequestHandler();`;
    const result = runTransform(source, 'app/server.ts');
    
    expect(result).toContain("from '@shopify/hydrogen/oxygen'");
    expect(result).not.toContain('@shopify/remix-oxygen');
  });
});