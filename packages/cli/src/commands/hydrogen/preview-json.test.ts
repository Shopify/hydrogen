import {Parser} from '@oclif/core';
import {afterEach, expect, it, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import Preview from './preview.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each([
  {argv: ['--json']},
  {argv: ['-j']},
  {argv: ['--build', '--watch', '--json', '--no-input']},
  {argv: ['--no-input']},
  {argv: []},
])(
  'keeps JSON, watch, and input options independent: $argv',
  async ({argv}) => {
    vi.stubEnv('SHOPIFY_FLAG_JSON', undefined);
    vi.stubEnv('SHOPIFY_FLAG_NO_INPUT', undefined);
    const {flags} = await Parser.parse(argv, {
      flags: {...Preview.baseFlags, ...Preview.flags},
    });
    expect(Boolean(flags.json)).toBe(
      argv.includes('--json') || argv.includes('-j'),
    );
    expect(Boolean(flags.watch)).toBe(argv.includes('--watch'));
    expect(Boolean(flags['no-input'])).toBe(argv.includes('--no-input'));
  },
);

it('accepts JSON from the environment and exposes the shared stream schema', async () => {
  vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
  const {flags} = await Parser.parse([], {flags: Preview.flags});
  expect(flags.json).toBe(true);
  expect(Preview.description).toContain(Preview.jsonOutputSchema.name);
  expect(
    Preview.jsonOutputSchema.validate({
      timestamp: '2026-10-26T10:00:00Z',
      source: 'hydrogen preview',
      message: 'Runtime reloaded',
    }),
  ).toMatchObject({source: 'hydrogen preview'});
});

it('writes fatal preview errors through the standard command error handler', async () => {
  const command = new Preview(['--json'], {} as any);
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  const {stdout} = await captureJsonOutput(() =>
    (command as any).catch(new AbortError('Preview startup failed')),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    error: {message: 'Preview startup failed'},
  });
});
