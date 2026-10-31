import {Parser} from '@oclif/core';
import {fileURLToPath} from 'node:url';
import {afterEach, expect, it, vi} from 'vitest';
import {AbortError} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import ShopifyCommand from '@shopify/cli-kit/node/base-command';
import {inTemporaryDirectory, writeFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {importVite} from '../../lib/import-utils.js';
import {getDevConfigInBackground} from '../../lib/dev-shared.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getCliCommand} from '../../lib/shell.js';
import {isViteProject} from '../../lib/vite-config.js';
import {resetAllLogs} from '../../lib/log.js';
import Dev from './dev.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/dev-shared.js');
vi.mock('../../lib/environment-variables.js');
vi.mock('../../lib/shell.js');
vi.mock('../../lib/vite-config.js');

afterEach(() => {
  resetAllLogs();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each([['--json'], ['-j'], ['--json', '--no-input'], ['--no-input'], []])(
  'parses JSON and input policy independently: %j',
  async (...argv: string[]) => {
    vi.stubEnv('SHOPIFY_FLAG_JSON', undefined);
    vi.stubEnv('SHOPIFY_FLAG_NO_INPUT', undefined);
    const {flags} = await Parser.parse(argv, {
      flags: {...Dev.baseFlags, ...Dev.flags},
    });
    expect(Boolean(flags.json)).toBe(
      argv.includes('--json') || argv.includes('-j'),
    );
    expect(Boolean(flags['no-input'])).toBe(argv.includes('--no-input'));
  },
);

it.each(['1', 'True', 'y'])(
  'accepts JSON mode from the environment: %s',
  async (value) => {
    vi.stubEnv('SHOPIFY_FLAG_JSON', value);
    const {flags} = await Parser.parse([], {flags: Dev.flags});
    expect(flags.json).toBe(true);
  },
);

it('exposes the stream contract in help and schema discovery', () => {
  expect(Dev.description).toContain('HydrogenDevLogEntry');
  expect(Dev.jsonOutputSchema.jsonSchema.definitions).toHaveProperty(
    'HydrogenRuntimeDetails',
  );
  const record = {
    timestamp: '2026-10-26T10:00:00Z',
    source: 'hydrogen dev',
    message: 'Ready: http://localhost:3000/',
  };
  expect(Dev.jsonOutputSchema.validate(record)).toEqual(record);
  expect(() =>
    Dev.jsonOutputSchema.validate({
      ...record,
      timestamp: '2026-10-26T10:00:00.123Z',
    }),
  ).toThrow();
  expect(() =>
    Dev.jsonOutputSchema.validate({...record, level: 'fatal'}),
  ).toThrow();
  expect(() =>
    Dev.jsonOutputSchema.validate({...record, unexpected: true}),
  ).toThrow();
});

it('writes a JSON error envelope when dev startup fails with --json', async () => {
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
    vi.mocked(isViteProject).mockResolvedValue(true);
    vi.mocked(getDevConfigInBackground).mockResolvedValue({
      customerAccountPush: false,
      fetchRemote: false,
      localVariables: {},
      storefrontId: undefined,
      storefrontTitle: undefined,
    });
    vi.mocked(getAllEnvironmentVariables).mockResolvedValue({
      allVariables: {},
      localVariables: {},
      remoteVariables: {},
      remoteSecrets: {},
      logInjectedVariables: vi.fn(),
    });
    vi.mocked(getCliCommand).mockResolvedValue('pnpm shopify hydrogen');
    vi.mocked(importVite).mockRejectedValue(
      new AbortError('Worker startup failed'),
    );
    const {stdout} = await captureJsonOutput(() =>
      Dev.run(['--json', '--path', directory], {
        root: fileURLToPath(new URL('../../..', import.meta.url)),
      }),
    );
    expect(importVite).toHaveBeenCalledWith(directory);
    const records = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records[0]).toMatchObject({
      source: 'hydrogen dev',
      message: 'Starting runtime',
    });
    expect(records.at(-1)).toMatchObject({
      error: {message: 'Worker startup failed'},
    });
  });
});
