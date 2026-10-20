import {describe, expect, it} from 'vitest';
import {getSameOriginPath} from './get-redirect-url';

describe('getSameOriginPath', () => {
  const origin = 'https://shop.example';

  it.each([
    ['/account/orders?page=2#latest', '/account/orders?page=2#latest'],
    ['/x/../account', '/account'],
    ['/search?q=https://other.example', '/search?q=https://other.example'],
    [`${origin}/account/orders`, '/account/orders'],
  ])('accepts %s as %s', (target, expected) => {
    expect(getSameOriginPath(target, origin)).toBe(expected);
  });

  it.each([
    [null],
    [''],
    ['account'],
    ['javascript:alert(1)'],
    ['https://other.example/p'],
    ['https:other.example/p'],
    ['//other.example/p'],
    ['/\\other.example/p'],
    // Same-origin values whose normalized path starts with `//`.
    [`${origin}//other.example/p`],
    ['//shop.example//other.example/p'],
    ['/x/..//other.example/p'],
    ['/x/../\\other.example/p'],
    ['/./\t/other.example/p'],
  ])('rejects %s', (target) => {
    expect(getSameOriginPath(target, origin)).toBeUndefined();
  });
});
