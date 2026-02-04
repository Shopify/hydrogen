import {describe, it, expect} from 'vitest';
import {normalizeUrl} from '../vite/virtual-routes/lib/normalize-url';

describe('normalizeUrl', () => {
  it('normalizes missing protocol and trailing slash', () => {
    expect(normalizeUrl('www.google.com/')).toBe('https://www.google.com');
    expect(normalizeUrl('google.com')).toBe('https://google.com');
    expect(normalizeUrl('https://google.com/')).toBe('https://google.com');
  });

  it('keeps http for localhost and loopback', () => {
    expect(normalizeUrl('http://localhost:3100')).toBe('http://localhost:3100');
    expect(normalizeUrl('localhost:3100/')).toBe('http://localhost:3100');
    expect(normalizeUrl('127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(normalizeUrl('[::1]:3000')).toBe('http://[::1]:3000');
  });

  it('preserves non-root paths and query/hash', () => {
    expect(normalizeUrl('example.com/path/')).toBe('https://example.com/path/');
    expect(normalizeUrl('example.com/path?foo=bar#hash')).toBe(
      'https://example.com/path?foo=bar#hash',
    );
  });
});
