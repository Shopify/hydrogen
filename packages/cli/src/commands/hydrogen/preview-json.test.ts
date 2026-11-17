import {Parser} from '@oclif/core';
import {fileURLToPath} from 'node:url';
import {afterEach, expect, it, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import ShopifyCommand from '@shopify/cli-kit/node/base-command';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {captureJsonOutput} from '../../../tests/output.js';
import {isClassicProject} from '../../lib/remix-config.js';
import {resetAllLogs} from '../../lib/log.js';
import Preview from './preview.js';

vi.mock('../../lib/remix-config.js', async (original) => ({
  ...(await original<typeof import('../../lib/remix-config.js')>()),
  isClassicProject: vi.fn(),
}));

afterEach(() => {
  resetAllLogs();
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

it('writes a JSON error envelope when preview startup fails with --json', async () => {
  await inTemporaryDirectory(async (directory) => {
    await writeFile(
      joinPath(directory, 'package.json'),
      JSON.stringify({dependencies: {'@shopify/hydrogen': '*'}}),
    );
    vi.spyOn(
      ShopifyCommand.prototype as unknown as {init(): Promise<unknown>},
      'init',
    ).mockResolvedValue(undefined);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(isClassicProject).mockRejectedValue(
      new AbortError('Preview startup failed'),
    );
    const {stdout} = await captureJsonOutput(() =>
      Preview.run(['--json', '--path', directory], {
        root: fileURLToPath(new URL('../../..', import.meta.url)),
      }),
    );
    expect(isClassicProject).toHaveBeenCalledWith(directory);
    const records = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records[0]).toMatchObject({
      source: 'hydrogen preview',
      message: 'Starting runtime',
    });
    expect(records.at(-1)).toMatchObject({
      error: {message: 'Preview startup failed'},
    });
  });
});
