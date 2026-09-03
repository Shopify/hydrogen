import {describe, it, expect} from 'vitest';
import {decodedPathname} from './build.js';

describe('decodedPathname()', () => {
  it('decodes percent-encoded characters', () => {
    expect(
      decodedPathname(
        new URL('file:///Users/x/Open%20Source/hydrogen/packages/'),
      ),
    ).toBe('/Users/x/Open Source/hydrogen/packages/');
  });

  it('leaves paths without encoded characters untouched', () => {
    expect(decodedPathname(new URL('file:///Users/x/hydrogen/packages/'))).toBe(
      '/Users/x/hydrogen/packages/',
    );
  });
});
