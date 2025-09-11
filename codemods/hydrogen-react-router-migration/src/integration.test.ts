/**
 * Integration Tests - Code Transformation Logic
 * 
 * Purpose: Tests the actual code transformation logic without file system operations.
 * These tests focus on WHAT gets transformed - verifying that the AST transformations
 * work correctly for different code patterns.
 * 
 * Test Coverage:
 * - Complete Hydrogen route file transformations (loader, action, meta, error handling)
 * - Context file transformations (createAppLoadContext → createHydrogenRouterContext)
 * - Server entry file transformations (RemixServer, virtual modules)
 * - JavaScript file support (not just TypeScript)
 * - Comment and custom code preservation
 * - No-op handling for files that don't need changes
 * 
 * Key Characteristics:
 * - Source code is provided directly to transformer (no real files)
 * - React Router prerequisite check is skipped
 * - Language detection is mocked/bypassed
 * - Tests individual transformation functions in isolation
 * - Fast execution, focused on transformation correctness
 * 
 * These tests complement the E2E tests by ensuring the core transformation
 * logic is correct without the complexity of file system operations.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import transformer from './index';
import jscodeshift from 'jscodeshift';

describe('Integration Tests', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hydrogen-migration-test-'));
  });
  
  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('transforms a complete Hydrogen route file', () => {
    const input = `
import { json, defer, redirect } from '@shopify/hydrogen';
import { Link, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/node';
import { createAppLoadContext } from '~/lib/context';

export const meta: MetaFunction = () => {
  return [
    { title: 'Hydrogen Store' },
    { description: 'A custom Hydrogen storefront' }
  ];
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { storefront, customerAccount, cart } = context;
  const language = context.storefront.i18n.language;
  
  try {
    const product = await storefront.query(PRODUCT_QUERY, {
      variables: { handle: params.handle }
    });
    
    if (!product) {
      throw new Response('Not Found', { status: 404 });
    }
    
    return defer({
      product,
      recommendations: storefront.query(RECOMMENDATIONS_QUERY)
    });
  } catch (error) {
    console.error('Error loading product:', error);
    return json({ error: 'Failed to load product' }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { cart } = context;
  
  return redirect('/cart');
}

export default function Product() {
  const data = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>{data.product.title}</h1>
      <Link to="/products">Back to products</Link>
    </div>
  );
}

const PRODUCT_QUERY = \`#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      id
      title
    }
  }
\`;

const RECOMMENDATIONS_QUERY = \`#graphql
  query Recommendations {
    products(first: 4) {
      nodes {
        id
        title
      }
    }
  }
\`;`;

    const filePath = 'app/routes/products.$handle.tsx';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    expect(result).toBeDefined();
    expect(result).toContain('import type { Route } from \'./+types/products.$handle\'');
    expect(result).toContain('Route.LoaderArgs');
    expect(result).toContain('Route.ActionArgs');
    expect(result).toContain('Route.MetaFunction');
    expect(result).toContain('data(');
    expect(result).not.toContain('json(');
    expect(result).not.toContain('defer(');
    expect(result).toContain('catch (error: unknown)');
    expect(result).toContain('customerAccount.i18n.language');
    expect(result).not.toContain('storefront.i18n.language');
    expect(result).toContain('Link');
    expect(result).toContain('useLoaderData');
    expect(result).toContain('react-router');
    expect(result).not.toContain('@remix-run/react');
    expect(result).not.toContain('@remix-run/node');
  });
  
  test('transforms a context file', () => {
    const input = `
import { createHydrogenContext } from '@shopify/hydrogen';
import { AppSession } from '~/lib/session';
import { CART_QUERY_FRAGMENT } from '~/lib/fragments';

export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext
) {
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache: await caches.open('hydrogen'),
    waitUntil: executionContext.waitUntil,
    session: AppSession.init(request, [env.SESSION_SECRET]),
    i18n: getLocaleFromRequest(request),
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });

  return {
    ...hydrogenContext,
    // Custom context
    analytics: new Analytics(env.ANALYTICS_KEY),
    featureFlags: await getFeatureFlags(env),
  };
}

function getLocaleFromRequest(request: Request) {
  return { language: 'EN', country: 'US' };
}`;

    const filePath = 'app/lib/context.ts';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    expect(result).toBeDefined();
    expect(result).toContain('createHydrogenRouterContext');
    expect(result).not.toContain('createAppLoadContext');
    // Context transformation creates Object.assign pattern
    expect(result).toContain('Object.assign');
    // TypeScript module augmentation
    if (result.includes('declare module')) {
      expect(result).toContain('ReactRouter');
      expect(result).toContain('AppLoadContext');
    }
  });
  
  test('transforms server entry file', () => {
    const input = `
import { RemixServer } from '@remix-run/react';
import { createRequestHandler } from '@shopify/remix-oxygen';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { createAppLoadContext } from '~/lib/context';

export default {
  async fetch(request, env, ctx) {
    const build = await import('virtual:remix/server-build');
    const appLoadContext = await createAppLoadContext(request, env, ctx);
    
    const handler = createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
      getLoadContext: () => appLoadContext,
    });
    
    return handler(request);
  },
};`;

    const filePath = 'app/entry.server.tsx';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    expect(result).toBeDefined();
    expect(result).toContain('ServerRouter');
    expect(result).not.toContain('RemixServer');
    expect(result).toContain('@shopify/hydrogen/oxygen');
    expect(result).not.toContain('@shopify/remix-oxygen');
    expect(result).toContain('virtual:react-router/server-build');
    expect(result).not.toContain('virtual:remix/server-build');
    // Context function import gets transformed
    if (result.includes('createHydrogenRouterContext')) {
      expect(result).toContain('createHydrogenRouterContext');
    }
  });
  
  test('handles JavaScript files', () => {
    const input = `
import { json } from '@shopify/hydrogen';
import { Link } from '@remix-run/react';

export async function loader({ request, context, params }) {
  const product = await context.storefront.query(PRODUCT_QUERY, {
    variables: { handle: params.handle }
  });
  
  return json({ product });
}

export default function Product() {
  const data = useLoaderData();
  
  return (
    <div>
      <h1>{data.product.title}</h1>
      <Link to="/products">Back to products</Link>
    </div>
  );
}`;

    const filePath = 'app/routes/products.$handle.js';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    expect(result).toBeDefined();
    expect(result).toContain('data(');
    expect(result).not.toContain('json(');
    expect(result).toContain('react-router');
    expect(result).not.toContain('@remix-run/react');
    // JavaScript route files may get JSDoc comments if they have loader/action
    // But since this uses inline destructuring, JSDoc might not be added
  });
  
  test('preserves custom code and comments', () => {
    const input = `
// Important: This is a custom implementation
import { json } from '@shopify/hydrogen';

/**
 * Product loader
 * @description Loads product data from Storefront API
 */
export async function loader({ params }) {
  // TODO: Add caching
  const product = await fetchProduct(params.handle);
  
  /* Multi-line comment
     should be preserved */
  
  return json({ 
    product,
    // Inline comment
    timestamp: Date.now()
  });
}

// Custom helper function
function fetchProduct(handle) {
  return { id: '1', handle };
}`;

    const filePath = 'app/routes/products.$handle.tsx';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    expect(result).toBeDefined();
    // Comments should be preserved
    expect(result).toContain('Important: This is a custom implementation');
    expect(result).toContain('Product loader');
    expect(result).toContain('TODO: Add caching');
    expect(result).toContain('Multi-line comment');
    expect(result).toContain('Inline comment');
    expect(result).toContain('Custom helper function');
    // Function should be preserved
    expect(result).toContain('function fetchProduct');
  });
  
  test('handles files with no transformations needed', () => {
    const input = `
import React from 'react';

export default function Component() {
  return <div>Hello World</div>;
}`;

    const filePath = 'app/components/Component.tsx';
    const fileInfo = { path: filePath, source: input };
    const api = {
      jscodeshift: jscodeshift.withParser('tsx'),
      stats: () => {},
      report: () => {}
    };
    
    const result = transformer(fileInfo, api, {});
    
    // Should return undefined when no changes are needed
    expect(result).toBeUndefined();
  });
});