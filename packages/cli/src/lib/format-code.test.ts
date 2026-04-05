import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getCodeFormatOptions, formatCode} from './format-code.js';

vi.mock('prettier', async () => {
  const actual = await vi.importActual<typeof import('prettier')>('prettier');
  return {
    ...actual,
    resolveConfig: vi.fn(),
  };
});

describe('getCodeFormatOptions', () => {
  let resolveConfig: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const prettier = await import('prettier');
    resolveConfig = prettier.resolveConfig as ReturnType<typeof vi.fn>;
    resolveConfig.mockReset();
  });

  it('strips plugins from resolved config', async () => {
    resolveConfig.mockResolvedValue({
      singleQuote: true,
      plugins: ['prettier-plugin-tailwindcss'],
    });

    const result = await getCodeFormatOptions(__filename);

    expect(result).toEqual({singleQuote: true});
    expect(result).not.toHaveProperty('plugins');
  });

  it('strips plugins even when there are multiple', async () => {
    resolveConfig.mockResolvedValue({
      singleQuote: true,
      trailingComma: 'all',
      plugins: [
        'prettier-plugin-tailwindcss',
        'prettier-plugin-organize-imports',
      ],
    });

    const result = await getCodeFormatOptions(__filename);

    expect(result).toEqual({singleQuote: true, trailingComma: 'all'});
    expect(result).not.toHaveProperty('plugins');
  });

  it('returns config as-is when no plugins are present', async () => {
    resolveConfig.mockResolvedValue({
      singleQuote: true,
      bracketSpacing: false,
    });

    const result = await getCodeFormatOptions(__filename);

    expect(result).toEqual({singleQuote: true, bracketSpacing: false});
  });

  it('returns default config when resolveConfig returns null', async () => {
    resolveConfig.mockResolvedValue(null);

    const result = await getCodeFormatOptions(__filename);

    expect(result).toEqual({
      arrowParens: 'always',
      singleQuote: true,
      bracketSpacing: false,
      trailingComma: 'all',
    });
  });

  it('returns default config when resolveConfig throws', async () => {
    resolveConfig.mockRejectedValue(new Error('config error'));

    const result = await getCodeFormatOptions(__filename);

    expect(result).toEqual({
      arrowParens: 'always',
      singleQuote: true,
      bracketSpacing: false,
      trailingComma: 'all',
    });
  });
});

describe('formatCode', () => {
  it('formats TypeScript code', async () => {
    const result = await formatCode('const x=1', {singleQuote: true}, 'file.ts');
    expect(result.trim()).toBe('const x = 1;');
  });

  it('formats without plugins in config', async () => {
    // Verify that formatCode works when config has no plugins
    // (the normal path after getCodeFormatOptions strips them)
    const result = await formatCode(
      'const x=1',
      {singleQuote: true},
      'file.ts',
    );
    expect(result.trim()).toBe('const x = 1;');
  });
});
