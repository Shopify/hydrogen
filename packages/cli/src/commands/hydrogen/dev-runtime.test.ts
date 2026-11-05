import {Console} from 'node:console';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {spawn} from 'node:child_process';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {resetAllLogs} from '../../lib/log.js';
import {runDevSession} from '../../lib/dev-session.js';
import {importVite} from '../../lib/import-utils.js';
import {
  findHydrogenPlugin,
  findOxygenPlugin,
  getViteConfig,
} from '../../lib/vite-config.js';
import {getDevConfigInBackground} from '../../lib/dev-shared.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getCliCommand} from '../../lib/shell.js';
import {getCodeFormatOptions} from '../../lib/format-code.js';
import {createEntryPointErrorHandler} from '../../lib/deps-optimizer.js';
import {runDev} from './dev.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/vite-config.js');
vi.mock('../../lib/dev-shared.js');
vi.mock('../../lib/environment-variables.js');
vi.mock('../../lib/shell.js');
vi.mock('../../lib/format-code.js');
vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}));
vi.mock('../../lib/deps-optimizer.js', async (original) => {
  const actual = await original<typeof import('../../lib/deps-optimizer.js')>();
  return {
    ...actual,
    createEntryPointErrorHandler: vi.fn(actual.createEntryPointErrorHandler),
  };
});
vi.mock('../../lib/build.js', () => ({hydrogenPackagesPath: undefined}));
vi.mock('../../lib/log.js', async (original) => ({
  ...(await original<typeof import('../../lib/log.js')>()),
  enhanceH2Logs: vi.fn(),
  setH2OVerbose: vi.fn(),
}));

afterEach(() => {
  resetAllLogs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([false, true])(
  'records Vite changes, requests and recoverable worker errors (JSON: %s)',
  async (json) => {
    const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-runtime-'));
    vi.stubGlobal(
      'console',
      new Console({stdout: process.stdout, stderr: process.stderr}),
    );
    const controller = new AbortController();
    const codegen = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: vi.fn(),
    });
    vi.mocked(spawn).mockReturnValue(codegen as any);
    const server = {
      config: {server: {}},
      resolvedUrls: {local: ['http://localhost:4321/'], network: []},
      watcher: Object.assign(new EventEmitter(), {close: vi.fn()}),
      ws: new EventEmitter(),
      close: vi.fn(),
      listen: vi.fn(),
      printUrls: vi.fn(),
      bindCLIShortcuts: vi.fn(),
    };
    let runtimeOptions: any;
    vi.mocked(findHydrogenPlugin).mockReturnValue({} as any);
    vi.mocked(findOxygenPlugin).mockReturnValue({
      api: {
        registerPluginOptions: (options: unknown) => {
          runtimeOptions = options;
        },
      },
    } as any);
    vi.mocked(getViteConfig).mockResolvedValue({
      remixConfig: {appDirectory: join(directory, 'app')},
    } as any);
    vi.mocked(getDevConfigInBackground).mockResolvedValue({
      customerAccountPush: false,
      localVariables: {},
      fetchRemote: false,
    } as any);
    vi.mocked(getAllEnvironmentVariables).mockResolvedValue({
      allVariables: {},
      logInjectedVariables: vi.fn(),
    } as any);
    vi.mocked(getCliCommand).mockResolvedValue('pnpm shopify hydrogen');
    vi.mocked(getCodeFormatOptions).mockResolvedValue({} as any);
    vi.mocked(importVite).mockResolvedValue({
      createLogger: () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()}),
      createServer: async (config: any) => {
        config.plugins[0].configResolved({});
        return server;
      },
    } as any);
    try {
      const output = await withCapturedStandardStreams(async (streams) => {
        await runDevSession(
          {
            command: 'hydrogen dev',
            directory,
            envFile: '.env',
            json,
            signal: controller.signal,
          },
          async (session) => {
            await runDev({
              path: directory,
              envFile: '.env',
              disableVersionCheck: true,
              codegen: true,
              cliConfig: {} as any,
              session,
            });
            server.watcher.emit('change', join(directory, 'app', 'routes.ts'));
            server.watcher.emit('change', join(directory, 'app', 'routes.ts'));
            for (const file of [
              'hydrogen-dev.jsonl',
              'hydrogen-preview.jsonl',
              'hydrogen-dev.json',
              'hydrogen-dev.json.session.tmp',
            ]) {
              server.watcher.emit(
                'change',
                join(directory, '.shopify', 'dev', file),
              );
            }
            server.watcher.emit(
              'change',
              join(directory, '.shopify', 'dev', 'windows.jsonl').replaceAll(
                '/',
                '\\',
              ),
            );
            server.watcher.emit(
              'change',
              join(directory, '.shopify', 'dev-tools.ts'),
            );
            await runtimeOptions.entryPointErrorHandler({
              stack: 'Error: Worker could not load a route',
            });
            vi.mocked(createEntryPointErrorHandler)
              .mock.calls.at(-1)![0]
              .showSuccessBanner();
            codegen.stderr.write('Invalid query');
            codegen.emit('close', 1);
            runtimeOptions.logRequestLine({
              request: {
                url: 'http://localhost:4321/products?view=all',
                method: 'GET',
                headers: {},
              },
              response: {status: 200},
              meta: {durationMs: 5},
            });
            console.log('Repeated worker message');
            console.log('Repeated worker message');
            console.log('[vite] connected');
            console.log(
              'Re-optimizing dependencies because the lockfile changed',
            );
            console.error('workerd $LLVM_SYMBOLIZER is not configured');
            console.warn('A promise rejection was handled asynchronously');
            console.warn('Sourcemap for @remix-run/server-runtime is missing');
            for (const method of ['GET', 'POST']) {
              runtimeOptions.logRequestLine?.({
                request: {
                  url: 'http://localhost:3000/products?view=all&_data=routes/products',
                  method,
                  headers: {},
                },
                response: {status: 200, statusText: 'OK', headers: {}},
                meta: {startTimeMs: 0, endTimeMs: 5, durationMs: 5},
              });
            }
            controller.abort();
          },
        );
        return {stdout: streams.stdout(), stderr: streams.stderr()};
      });
      const folder = join(directory, '.shopify', 'dev');
      const files = await readdir(folder);
      const log = await readFile(join(folder, files[0]!), 'utf8');
      if (json) expect(output.stdout).toBe(log);
      const records = log
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(
        records
          .filter(({message}) => message.startsWith('File changed:'))
          .map(({message}) => message),
      ).toEqual([
        `File changed: ${join(directory, 'app', 'routes.ts')}`,
        `File changed: ${join(directory, 'app', 'routes.ts')}`,
        `File changed: ${join(directory, '.shopify', 'dev-tools.ts')}`,
      ]);
      expect(records).toContainEqual(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Worker could not load a route'),
        }),
      );
      expect(
        records.filter(({message}) => message.includes('/products?view=all ')),
      ).toHaveLength(1);
      expect(server.printUrls).toHaveBeenCalledTimes(json ? 0 : 1);
      expect(server.bindCLIShortcuts).toHaveBeenCalledTimes(json ? 0 : 1);
      expect(server.close).toHaveBeenCalledTimes(1);
      for (const message of [
        'Invalid query',
        'Codegen process exited with code 1',
      ]) {
        expect(
          records.filter((record) => record.message.includes(message)),
        ).toHaveLength(1);
      }
      for (const noise of [
        '[vite] connected',
        'Re-optimizing dependencies',
        '$LLVM_SYMBOLIZER',
        'A promise rejection',
        'Sourcemap for',
      ]) {
        expect(log).not.toContain(noise);
      }
      if (json) {
        expect(
          records.filter(({message}) =>
            message.includes('Worker could not load a route'),
          ),
        ).toHaveLength(1);
        expect(
          records.filter(({message}) => message === 'Runtime recovered'),
        ).toHaveLength(1);
        expect(output.stderr).toBe('');
        expect(
          records.filter(({message}) => message === 'Repeated worker message'),
        ).toHaveLength(2);
        expect(
          records.filter(({message}) =>
            message.includes('/products?view=all&_data=routes/products'),
          ),
        ).toHaveLength(2);
      }
    } finally {
      await rm(directory, {recursive: true, force: true});
    }
  },
);
