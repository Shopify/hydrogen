import {describe, it, expect} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {parseGid} from './gid.js';

describe('parseGid', () => {
  it('returns an ID', () => {
    const id = parseGid('gid://shopify/HydrogenStorefront/324');
    expect(id).toStrictEqual('324');
  });

  describe('when the global ID is invalid', () => {
    it('throws an error', () => {
      expect(() => parseGid('321asd')).toThrow(AbortError);
    });
  });
});
