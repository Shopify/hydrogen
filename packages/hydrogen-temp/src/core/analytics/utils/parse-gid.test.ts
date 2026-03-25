import {describe, it, expect} from 'vitest';
import {parseGid} from './parse-gid';

describe('parseGid', () => {
  it('parses a standard Shopify GID', () => {
    const result = parseGid('gid://shopify/Product/123');
    expect(result.id).toBe('123');
    expect(result.resource).toBe('Product');
    expect(result.resourceId).toBe('123');
  });

  it('parses a Shop GID', () => {
    const result = parseGid('gid://shopify/Shop/456');
    expect(result.id).toBe('456');
    expect(result.resource).toBe('Shop');
  });

  it('parses a Cart GID with alphanumeric id', () => {
    const result = parseGid('gid://shopify/Cart/abc123');
    expect(result.id).toBe('abc123');
    expect(result.resource).toBe('Cart');
  });

  it('returns empty defaults for undefined input', () => {
    const result = parseGid(undefined);
    expect(result.id).toBe('');
    expect(result.resource).toBeNull();
  });

  it('returns empty defaults for invalid input', () => {
    const result = parseGid('not-a-gid');
    expect(result.id).toBe('');
    expect(result.resource).toBeNull();
  });
});
