import {describe, expect, it} from 'vitest';
import {separator, assertNever} from './util';

describe('util smoke test', () => {
  it('separator should return a string ending with newline', () => {
    const result = separator();
    expect(result).toContain('\n');
    expect(typeof result).toBe('string');
  });

  it('assertNever should throw error', () => {
    expect(() => {
      assertNever('invalid' as never);
    }).toThrow('Expected `never`');
  });
});
