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
  fetchWithTimeout,
  fetchModuleWithRetry,
  isPrebundleVersionMismatch,
} from './worker-entry.js';

// ---------------------------------------------------------------------------
// isPrebundleVersionMismatch
// ---------------------------------------------------------------------------
describe('isPrebundleVersionMismatch', () => {
  it('detects errors with the Vite outdated dep error code', () => {
    const error = new Error('anything') as any;
    error.code = 'ERR_OUTDATED_OPTIMIZED_DEP';
    expect(isPrebundleVersionMismatch(error)).toBe(true);
  });

  it('returns false for errors without the code', () => {
    expect(isPrebundleVersionMismatch(new Error('Module not found'))).toBe(
      false,
    );
    expect(isPrebundleVersionMismatch(new Error('syntax error'))).toBe(false);
  });

  it('returns false for errors with a different code', () => {
    const error = new Error('some error') as any;
    error.code = 'ERR_SOMETHING_ELSE';
    expect(isPrebundleVersionMismatch(error)).toBe(false);
  });

  it('handles nullish error gracefully', () => {
    expect(isPrebundleVersionMismatch(null as any)).toBe(false);
    expect(isPrebundleVersionMismatch(undefined as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchWithTimeout
// ---------------------------------------------------------------------------
describe('fetchWithTimeout', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the response on success', async () => {
    const expected = new Response('ok', {status: 200});
    mockFetch.mockResolvedValueOnce(expected);

    const res = await fetchWithTimeout(
      new URL('http://localhost:5173/test'),
      5000,
    );

    expect(res).toBe(expected);
  });

  it('passes an AbortSignal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(new Response('ok'));

    await fetchWithTimeout(new URL('http://localhost:5173/test'), 5000);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toHaveProperty('signal');
    expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
  });

  it('propagates network errors from fetch', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      fetchWithTimeout(new URL('http://localhost:5173/test'), 5000),
    ).rejects.toThrow('fetch failed');
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

  it('propagates error code from JSON error response', async () => {
    const errorBody = JSON.stringify({
      error: 'There is a new version of the pre-bundle for "react"',
      code: 'ERR_OUTDATED_OPTIMIZED_DEP',
    });
    mockFetch.mockResolvedValueOnce(
      new Response(errorBody, {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }),
    );
    // All attempts fail with the same error
    mockFetch.mockResolvedValueOnce(new Response(errorBody, {status: 500}));
    mockFetch.mockResolvedValueOnce(new Response(errorBody, {status: 500}));

    try {
      await fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=test'),
      );
      expect.unreachable('should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('ERR_OUTDATED_OPTIMIZED_DEP');
    }
  });

  it('handles non-JSON error bodies without propagating code', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('plain text error', 500));
    mockFetch.mockResolvedValueOnce(textResponse('plain text error', 500));
    mockFetch.mockResolvedValueOnce(textResponse('plain text error', 500));

    try {
      await fetchModuleWithRetry(
        new URL('http://localhost:5173/__vite_fetch_module?id=test'),
      );
      expect.unreachable('should have thrown');
    } catch (error: any) {
      expect(error.code).toBeUndefined();
    }
  });

  it('delegates to fetchWithTimeout which wires AbortSignal', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({code: 'ok'}));

    await fetchModuleWithRetry(
      new URL('http://localhost:5173/__vite_fetch_module?id=test'),
    );

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1]).toHaveProperty('signal');
    expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// Not tested here: fetchEntryModule / recoveryPromise deduplication
// ---------------------------------------------------------------------------
// The prebundle recovery flow (fetchEntryModule → resetRuntime →
// recoveryPromise → importEntryModule retry) depends on ModuleRunner
// and module-level singleton state that is impractical to unit test.
// This path is exercised by the E2E test suite when parallel Playwright
// workers trigger Vite's dep optimizer invalidation during dev server runs.
