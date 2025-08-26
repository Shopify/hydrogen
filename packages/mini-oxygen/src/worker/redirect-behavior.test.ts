import {join} from 'node:path';
import {writeFile, rm as remove, readFile} from 'node:fs/promises';
import {temporaryDirectory} from 'tempy';
import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';
import {createMiniOxygen, Request, Response, type MiniOxygenOptions} from './index.js';

/**
 * Tests that MiniOxygen Worker runtime correctly handles redirects without following them,
 * ensuring React Router's redirect() and redirectDocument() work as expected.
 * 
 * This tests the worker environment specifically, without the Node.js HTTP server layer.
 */
describe('MiniOxygen Worker redirect behavior', () => {
  let fixture: RedirectFixture;

  beforeEach(async () => {
    fixture = await createRedirectFixture('worker-redirect-fixture');
  });

  afterEach(async () => {
    await fixture.destroy();
  });

  it('should NOT follow 302 redirects in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const request = new Request('http://localhost/external-redirect');
    const response = await miniOxygen.dispatchFetch(request);
    
    // Worker should return the redirect response, not follow it
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/oauth');
    
    // Verify body is empty for redirects
    const text = await response.text();
    expect(text).toBe('');
    
    await miniOxygen.dispose();
  });

  it('should handle redirectDocument in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const request = new Request('http://localhost/redirect-document');
    const response = await miniOxygen.dispatchFetch(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://external.com');
    expect(response.headers.get('X-Remix-Reload-Document')).toBe('true');
    
    await miniOxygen.dispose();
  });

  it('should preserve query parameters in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const request = new Request('http://localhost/redirect-with-query');
    const response = await miniOxygen.dispatchFetch(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/oauth?client_id=abc123&return_url=%2Fdashboard&state=xyz789');
    
    await miniOxygen.dispose();
  });

  it('should handle multiple Set-Cookie headers in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const request = new Request('http://localhost/redirect-multiple-cookies');
    const response = await miniOxygen.dispatchFetch(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/dashboard');
    
    // In worker environment, check getSetCookie method
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session_token='),
        expect.stringContaining('refresh_token='),
        expect.stringContaining('user_id='),
      ])
    );
    
    await miniOxygen.dispose();
  });

  it('should preserve security headers in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const request = new Request('http://localhost/redirect-with-csp');
    const response = await miniOxygen.dispatchFetch(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://secure.example.com');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'"
    );
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    
    await miniOxygen.dispose();
  });

  it('should handle various redirect status codes in worker runtime', async () => {
    const miniOxygen = createMiniOxygen({
      workers: [{
        name: 'test-worker',
        modules: true,
        script: await fixture.getScript(),
      }],
    });

    await miniOxygen.ready;
    
    const statuses = [301, 302, 303, 307, 308];
    
    for (const status of statuses) {
      const request = new Request(`http://localhost/redirect/${status}`);
      const response = await miniOxygen.dispatchFetch(request);
      
      expect(response.status).toBe(status);
      expect(response.headers.get('location')).toBeTruthy();
    }
    
    await miniOxygen.dispose();
  });
});

interface RedirectFixture {
  paths: {
    root: string;
    workerFile: string;
  };
  getScript: () => Promise<string>;
  destroy: () => Promise<void>;
}

async function createRedirectFixture(name: string): Promise<RedirectFixture> {
  const directory = await temporaryDirectory({prefix: name});
  const paths = {
    root: directory,
    workerFile: join(directory, 'worker.mjs'),
  };

  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({
      name: 'worker-redirect-test',
      version: '1.0.0',
      type: 'module',
    }, null, 2),
  );

  // Same worker code as node tests to ensure consistency
  await writeFile(
    paths.workerFile,
    `
// Simulate React Router's redirect function
function redirect(url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Location', url);
  
  return new Response(null, {
    status: init.status || 302,
    headers,
  });
}

// Simulate React Router's redirectDocument function
function redirectDocument(url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Location', url);
  headers.set('X-Remix-Reload-Document', 'true');
  
  return new Response(null, {
    status: init.status || 302,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/external-redirect':
        // Simulate OAuth redirect to external domain
        return redirect('https://example.com/oauth');
      
      case '/permanent-redirect':
        // 301 permanent redirect
        return redirect('https://example.com/moved', { status: 301 });
      
      case '/redirect-with-headers':
        // Redirect with custom headers (like Set-Cookie for sessions)
        return redirect('https://example.com', {
          headers: {
            'X-Custom-Header': 'preserved',
            'Set-Cookie': 'session=abc123',
          }
        });
      
      case '/redirect-document':
        // React Router's redirectDocument for external navigation
        return redirectDocument('https://external.com');
      
      case '/redirect-with-query':
        // Redirect with query parameters (common in OAuth flows)
        return redirect('https://example.com/oauth?client_id=abc123&return_url=%2Fdashboard&state=xyz789');
      
      case '/redirect-multiple-cookies':
        // Multiple Set-Cookie headers (auth flow with session + refresh tokens)
        const headers = new Headers();
        headers.set('Location', 'https://example.com/dashboard');
        headers.append('Set-Cookie', 'session_token=sess_abc123; Path=/; HttpOnly; Secure; SameSite=Lax');
        headers.append('Set-Cookie', 'refresh_token=ref_xyz789; Path=/; HttpOnly; Secure; SameSite=Strict');
        headers.append('Set-Cookie', 'user_id=12345; Path=/; Secure; SameSite=Lax');
        
        return new Response(null, {
          status: 302,
          headers,
        });
      
      case '/redirect-with-csp':
        // Redirect with security headers (CSP, X-Frame-Options, etc.)
        return redirect('https://secure.example.com', {
          headers: {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'",
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      
      default:
        // Handle /redirect/{status} for various status codes
        const match = url.pathname.match(/\\/redirect\\/(\\d{3})/);
        if (match) {
          const status = parseInt(match[1], 10);
          return redirect('https://example.com/destination', { status });
        }
        
        return new Response('Not Found', { status: 404 });
    }
  }
}
    `.trim(),
  );

  return {
    paths,
    getScript: async () => {
      return readFile(paths.workerFile, 'utf-8');
    },
    destroy: async () => {
      await remove(directory, {force: true, recursive: true});
    },
  };
}