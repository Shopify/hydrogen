import {describe, it, expect} from 'vitest';
import {Flags} from '@oclif/core';
import {
  flagsToCamelObject,
  parseProcessFlags,
  requiredIfNonInteractive,
} from './flags.js';

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

  it('parses flags from process.argv', async () => {
    expect(
      parseProcessFlags(
        'node ./bin --force --install-deps --template demo-store --path test --language ts'.split(
          ' ',
        ),
      ),
    ).toMatchObject({
      force: true,
      installDeps: true,
      template: 'demo-store',
      path: 'test',
      language: 'ts',
    });

    expect(
      parseProcessFlags(
        'node ./bin -f --no-install-deps --language js'.split(' '),
        {f: 'force'},
      ),
    ).toMatchObject({
      force: true,
      installDeps: false,
      language: 'js',
    });
  });

  it('annotates flags that are required in non-interactive terminals', async () => {
    const original = Flags.string({description: 'A value used by a prompt.'});
    const annotated = requiredIfNonInteractive(original);

    expect(annotated).toMatchObject({
      requiredIfNonInteractive: true,
      description: '(required if non-interactive) A value used by a prompt.',
    });
    expect(original.description).toBe('A value used by a prompt.');
  });
});
