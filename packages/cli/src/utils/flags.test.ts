import {describe, it, expect} from 'vitest';
import {flagsToCamelObject} from './flags.js';

describe('CLI flag utils', () => {
  it('turns kebab-case flags to camelCase', async () => {
    expect(
      flagsToCamelObject({
        'kebab-case': 'value',
        'another-kebab-case': 'value',
        flag: 'value',
      }),
    ).toMatchObject({
      kebabCase: 'value',
      anotherKebabCase: 'value',
      flag: 'value',
    });
  });
});
