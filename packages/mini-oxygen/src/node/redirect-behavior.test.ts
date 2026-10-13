import {join} from 'node:path';
import {writeFile, rm as remove} from 'node:fs/promises';
import {temporaryDirectory} from 'tempy';
import {it, vi, describe, beforeEach, expect, afterEach} from 'vitest';
import {
  startServer,
  type MiniOxygenPreviewOptions,
  Request,
  Response,
} from './index.js';
import type {DispatchFetch} from './server.js';

/**
 * Tests that MiniOxygen correctly handles redirects without following them,
 * ensuring React Router's redirect() and redirectDocument() work as expected.
 *
 * The key issue: Miniflare v4 by default follows redirects, which breaks
 * external redirects (like OAuth) that need to be handled by the browser.
 */
describe('MiniOxygen redirect behavior', () => {
  let fixture: RedirectFixture;
  let servers: Array<{close: () => Promise<void>}> = [];
  const defaultOptions: MiniOxygenPreviewOptions = {
    log: vi.fn(),
    port: 0, // Use port 0 to let OS assign a random available port
  };

  beforeEach(async () => {
    fixture = await createRedirectFixture('redirect-fixture');
    servers = [];
  });

  afterEach(async () => {
    // Clean up all servers that were created during the test
    await Promise.all(servers.map((s) => s.close().catch(() => {})));
    servers = [];
    await fixture.destroy();
  });

  // Helper function to start server and track it for cleanup
  async function startTrackedServer(options: MiniOxygenPreviewOptions) {
    const server = await startServer(options);
    servers.push(server);
    return server;
  }

  it('should NOT follow 302 redirects (external URLs)', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/external-redirect`,
      {
        redirect: 'manual',
      },
    );

    // MiniOxygen should return the redirect response, not follow it
    expect(response.status).toBe(302);
    expect(response.redirected).toBe(false);
    expect(response.headers.get('location')).toBe('https://example.com/oauth');

    await miniOxygen.close();
  });

  it('should NOT follow 301 redirects', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/permanent-redirect`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(301);
    expect(response.redirected).toBe(false);
    expect(response.headers.get('location')).toBe('https://example.com/moved');

    await miniOxygen.close();
  });

  it('should preserve all redirect headers (including custom ones)', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    // Use a raw HTTP request to bypass any fetch quirks
    const http = await import('node:http');
    const response = await new Promise<{
      status: number;
      headers: Record<string, string>;
    }>((resolve) => {
      http.get(
        `http://localhost:${miniOxygen.port}/redirect-with-headers`,
        (res) => {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            headers[key] = Array.isArray(value)
              ? value.join(', ')
              : (value as string);
          }
          resolve({status: res.statusCode!, headers});
          res.resume(); // Consume the response body
        },
      );
    });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com');
    expect(response.headers['x-custom-header']).toBe('preserved');
    expect(response.headers['set-cookie']).toBe('session=abc123');

    await miniOxygen.close();
  });

  it('should handle redirectDocument (with X-Remix-Reload-Document)', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/redirect-document`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(302);
    expect(response.redirected).toBe(false);
    expect(response.headers.get('location')).toBe('https://external.com');
    expect(response.headers.get('X-Remix-Reload-Document')).toBe('true');

    await miniOxygen.close();
  });

  it('should handle various redirect status codes', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const statuses = [301, 302, 303, 307, 308];

    for (const status of statuses) {
      const response = await fetch(
        `http://localhost:${miniOxygen.port}/redirect/${status}`,
        {
          redirect: 'manual',
        },
      );

      expect(response.status).toBe(status);
      expect(response.redirected).toBe(false);
      expect(response.headers.get('location')).toBeTruthy();
    }

    await miniOxygen.close();
  });

  it('should pass redirect: manual through onRequest callback', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
      onRequest: async (request: Request, dispatchFetch: DispatchFetch) => {
        const response = await dispatchFetch(request);

        // Verify that dispatchFetch doesn't follow redirects
        if (request.url.includes('/external-redirect')) {
          expect(response.status).toBe(302);
          expect(response.headers.get('location')).toBe(
            'https://example.com/oauth',
          );
        }

        return response;
      },
    });

    await fetch(`http://localhost:${miniOxygen.port}/external-redirect`, {
      redirect: 'manual',
    });

    await miniOxygen.close();
  });

  it('should return null body for redirect responses', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/external-redirect`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/oauth');

    // React Router expects redirect responses to have no body
    const text = await response.text();
    expect(text).toBe('');

    await miniOxygen.close();
  });

  it('should preserve query parameters in redirect Location header', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/redirect-with-query`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://example.com/oauth?client_id=abc123&return_url=%2Fdashboard&state=xyz789',
    );

    await miniOxygen.close();
  });

  it('should handle multiple Set-Cookie headers in redirects', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/redirect-multiple-cookies`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://example.com/dashboard',
    );

    // Check raw headers using Node.js http to see multiple cookies
    const http = await import('node:http');
    const rawResponse = await new Promise<{
      status: number;
      headers: Record<string, string | string[]>;
    }>((resolve) => {
      http.get(
        `http://localhost:${miniOxygen.port}/redirect-multiple-cookies`,
        (res) => {
          const headers: Record<string, string | string[]> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            headers[key] = value!;
          }
          resolve({status: res.statusCode!, headers});
          res.resume();
        },
      );
    });

    // Multiple Set-Cookie headers should be preserved
    const setCookieHeader = rawResponse.headers['set-cookie'];
    expect(
      Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader],
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('session_token='),
        expect.stringContaining('refresh_token='),
        expect.stringContaining('user_id='),
      ]),
    );

    await miniOxygen.close();
  });

  it('should preserve Content-Security-Policy headers in redirects', async () => {
    const miniOxygen = await startTrackedServer({
      ...defaultOptions,
      workerFile: fixture.paths.workerFile,
    });

    const response = await fetch(
      `http://localhost:${miniOxygen.port}/redirect-with-csp`,
      {
        redirect: 'manual',
      },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://secure.example.com');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'",
    );
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');

    await miniOxygen.close();
  });
});

interface RedirectFixture {
  paths: {
    root: string;
    workerFile: string;
  };
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
    JSON.stringify(
      {
        name: 'redirect-test-worker',
        version: '1.0.0',
        type: 'module',
      },
      null,
      2,
    ),
  );

  // Simple worker that tests various redirect scenarios
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
    destroy: async () => {
      await remove(directory, {force: true, recursive: true});
    },
  };
}
