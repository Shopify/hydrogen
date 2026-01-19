import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {fetchLatestCliVersion} from './common.js';

vi.mock('@shopify/cli-kit/node/http', () => ({
  fetch: vi.fn(),
}));

describe('fetchLatestCliVersion', () => {
  const mockFetch = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const httpModule = await import('@shopify/cli-kit/node/http');
    vi.mocked(httpModule.fetch).mockImplementation(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the latest version from npm when available and major version matches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'dist-tags': {latest: '3.90.2'},
        }),
    });

    const result = await fetchLatestCliVersion('3.85.4');

    expect(result).toBe('3.90.2');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@shopify/cli',
      expect.objectContaining({
        headers: {Accept: 'application/json'},
      }),
    );
  });

  it('returns bundled version when npm fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchLatestCliVersion('3.85.4');

    expect(result).toBe('3.85.4');
  });

  it('returns bundled version when network error occurs', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchLatestCliVersion('3.85.4');

    expect(result).toBe('3.85.4');
  });

  it('returns bundled version when major version differs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'dist-tags': {latest: '4.0.0'},
        }),
    });

    const result = await fetchLatestCliVersion('3.85.4');

    expect(result).toBe('3.85.4');
  });

  it('returns bundled version when npm response has no latest tag', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'dist-tags': {},
        }),
    });

    const result = await fetchLatestCliVersion('3.85.4');

    expect(result).toBe('3.85.4');
  });

  it('handles bundled versions with tilde prefix', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'dist-tags': {latest: '3.92.0'},
        }),
    });

    const result = await fetchLatestCliVersion('~3.85.4');

    expect(result).toBe('3.92.0');
  });

  it('handles bundled versions with caret prefix', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'dist-tags': {latest: '3.92.0'},
        }),
    });

    const result = await fetchLatestCliVersion('^3.85.4');

    expect(result).toBe('3.92.0');
  });

  it('returns bundled version when it cannot parse the version', async () => {
    const result = await fetchLatestCliVersion('invalid-version');

    expect(result).toBe('invalid-version');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
