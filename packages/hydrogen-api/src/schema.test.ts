import {existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {getSchema} from './schema';

// Mock `node:fs` with a default delegate to the real implementation so
// happy-path tests still see real files on disk. Individual tests can
// override `existsSync` for one call to simulate a missing schema.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  };
});

describe('getSchema', () => {
  it('returns an absolute path to the bundled storefront schema', () => {
    const path = getSchema('storefront');
    expect(path.endsWith(join('generated', 'storefront.schema.json'))).toBe(
      true,
    );
    expect(statSync(path).isFile()).toBe(true);
  });

  it('returns an absolute path to the bundled customer-account schema', () => {
    const path = getSchema('customer-account');
    expect(
      path.endsWith(join('generated', 'customer-account.schema.json')),
    ).toBe(true);
    expect(statSync(path).isFile()).toBe(true);
  });

  it('throws a helpful error for an unknown API', () => {
    expect(() => getSchema('bogus' as unknown as 'storefront')).toThrowError(
      /Please use "storefront" or "customer-account"/,
    );
  });

  it('throws when the schema file is missing on disk', () => {
    vi.mocked(existsSync).mockReturnValueOnce(false);
    expect(() => getSchema('storefront')).toThrowError(
      /install may be corrupt/,
    );
  });

  it('returns undefined when missing and throwIfMissing is false', () => {
    vi.mocked(existsSync).mockReturnValueOnce(false);
    expect(getSchema('storefront', {throwIfMissing: false})).toBeUndefined();
  });
});
