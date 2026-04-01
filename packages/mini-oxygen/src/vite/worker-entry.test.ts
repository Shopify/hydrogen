import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

// Mock heavy imports that worker-entry.ts pulls in but tests don't need
vi.mock('vite/module-runner', () => ({
  EvaluatedModuleNode: class {},
  ModuleRunner: class {},
  ssrModuleExportsKey: '__vite_ssr_exports__',
}));
vi.mock('../worker/handler.js', () => ({
  withRequestHook: vi.fn(),
}));

import {
  fetchModuleWithRetry,
  isPrebundleVersionMismatch,
} from './worker-entry.js';

// ---------------------------------------------------------------------------
// isPrebundleVersionMismatch
// ---------------------------------------------------------------------------
describe('isPrebundleVersionMismatch', () => {
  it('detects the Vite prebundle invalidation message', () => {
    const error = new Error(
      'There is a new version of the pre-bundle for "react"',
    );
    expect(isPrebundleVersionMismatch(error)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isPrebundleVersionMismatch(new Error('Module not found'))).toBe(
      false,
    );
    expect(isPrebundleVersionMismatch(new Error('syntax error'))).toBe(false);
  });

  it('falls back to error.stack when message is nullish', () => {
    // The function uses `??` (nullish coalescing) — only null/undefined
    // triggers the stack fallback, not empty string.
    const error = {
      message: undefined,
      stack: 'Error: new version of the pre-bundle detected\n  at foo.ts:1',
    } as unknown as Error;
    expect(isPrebundleVersionMismatch(error)).toBe(true);
  });

  it('handles fully nullish error properties gracefully', () => {
    const error = {message: undefined, stack: undefined} as unknown as Error;
    expect(isPrebundleVersionMismatch(error)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchModuleWithRetry
// ---------------------------------------------------------------------------
describe('fetchModuleWithRetry', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {'Content-Type': 'application/json'},
    });
  }

  function textResponse(body: string, status: number): Response {
    return new Response(body, {status});
  }

  it('returns {result: Promise<json>} on first successful attempt', async () => {
    const payload = {id: 'test-module', code: 'export default 42'};
    mockFetch.mockResolvedValueOnce(jsonResponse(payload));

    const result = await fetchModuleWithRetry(
      new URL('http://localhost:5173/__vite_fetch_module?id=test'),
    );

    expect(result).toHaveProperty('result');
    // result.result is an unresolved Promise (Vite's transport contract)
    await expect(result.result).resolves.toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx and succeeds on subsequent attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(textResponse('Internal Server Error', 500))
      .mockResolvedValueOnce(jsonResponse({code: 'ok'}));

    const result = await fetchModuleWithRetry(
      new URL('http://localhost:5173/__vite_fetch_module?id=test'),
    );

    await expect(result.result).resolves.toEqual({code: 'ok'});
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on 4xx without retrying', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('Not Found', 404));

    await expect(
      fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=missing'),
      ),
    ).rejects.toThrow(/Module fetch failed \(404\)/);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on 400 without retrying', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('Bad Request', 400));

    await expect(
      fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=bad'),
      ),
    ).rejects.toThrow(/Module fetch failed \(400\)/);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network errors and succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse({code: 'recovered'}));

    const result = await fetchModuleWithRetry(
      new URL('http://localhost:5173/__vite_fetch_module?id=test'),
    );

    await expect(result.result).resolves.toEqual({code: 'recovered'});
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retry attempts', async () => {
    mockFetch
      .mockResolvedValueOnce(textResponse('Error', 500))
      .mockResolvedValueOnce(textResponse('Error', 502))
      .mockResolvedValueOnce(textResponse('Error', 503));

    await expect(
      fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=test'),
      ),
    ).rejects.toThrow(/Module fetch failed after 3 attempts/);

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('includes the last error message when all attempts fail', async () => {
    mockFetch.mockRejectedValue(new Error('connection refused'));

    await expect(
      fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=test'),
      ),
    ).rejects.toThrow(/connection refused/);
  });

  it('passes AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({code: 'ok'}));

    await fetchModuleWithRetry(
      new URL('http://localhost:5173/__vite_fetch_module?id=test'),
    );

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toHaveProperty('signal');
    expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
  });
});
