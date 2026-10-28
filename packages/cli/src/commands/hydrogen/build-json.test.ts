import {afterEach, expect, it, vi} from 'vitest';
import {realpath} from 'node:fs/promises';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {captureJsonOutput} from '../../../tests/output.js';
import {getRemixConfig} from '../../lib/remix-config.js';
import {codegen, watchCodegen} from '../../lib/codegen.js';
import Check, {runCheckRoutes} from './check.js';
import Codegen, {runCodegen} from './codegen.js';
import Build from './build.js';
import {Parser} from '@oclif/core';
import ShopifyCommand from '@shopify/cli-kit/node/base-command';
import {runWithCommandEventsForCommand} from '@shopify/cli-kit/node/command-events';
import {isHydrogenProject} from '../../lib/hydrogen-command-policy.js';
import {getViteConfig, isViteProject} from '../../lib/vite-config.js';
import {importVite} from '../../lib/import-utils.js';
import {fileSize} from '@shopify/cli-kit/node/fs';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {writeJsonResult} from '../../lib/json-output.js';
import {AbortError, handler} from '@shopify/cli-kit/node/error';

vi.mock('../../lib/remix-config.js', () => ({
  getRemixConfig: vi.fn(),
  getProjectPaths: () => ({root: '/project'}),
}));
vi.mock('../../lib/codegen.js', () => ({
  codegen: vi.fn(),
  watchCodegen: vi.fn(),
  spawnCodegenProcess: vi.fn(),
}));
vi.mock('../../lib/vite-config.js');
vi.mock('../../lib/hydrogen-command-policy.js');
vi.mock('../../lib/import-utils.js');
vi.mock('node:fs/promises', async (original) => ({
  ...(await original<typeof import('node:fs/promises')>()),
  realpath: vi.fn(),
}));
vi.mock('@shopify/cli-kit/node/fs', async (original) => ({
  ...(await original<typeof import('@shopify/cli-kit/node/fs')>()),
  removeFile: vi.fn(),
  fileSize: vi.fn(),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('encodes missing and reserved routes in one document without text banners', async () => {
  vi.mocked(getRemixConfig).mockResolvedValue({
    routes: {root: {id: 'root'}, cdn: {id: 'cdn', path: 'cdn/private'}},
  } as any);
  const {stdout, stderr} = await captureJsonOutput(() =>
    runCheckRoutes({directory: '/project'}),
  );
  expect(JSON.parse(stdout)).toMatchObject({
    missingRoutes: expect.arrayContaining(['cart']),
    reservedRoutes: ['cdn/private'],
  });
  expect(stderr).toBe('');
});

it('encodes generated files and preserves diagnostics on stderr', async () => {
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
  } as any);
  vi.mocked(codegen).mockImplementation(async () => {
    outputInfo('Generating types');
    return {'storefrontapi.generated.d.ts': ['app/**/*.tsx']};
  });
  const {stdout, stderr} = await captureJsonOutput(() =>
    runCodegen({directory: '/project'}),
  );
  expect(JSON.parse(stdout)).toEqual({
    files: [
      {
        path: '/project/storefrontapi.generated.d.ts',
        sources: ['app/**/*.tsx'],
      },
    ],
  });
  expect(JSON.parse(stderr)).toMatchObject({
    type: 'diagnostic',
    message: 'Generating types',
  });
});

it('keeps codegen failures on the fatal-error path', async () => {
  vi.mocked(codegen).mockRejectedValue(new Error('Invalid query'));
  const {stdout} = await captureJsonOutput(async () => {
    await expect(runCodegen({directory: '/project'})).rejects.toThrow(
      'Invalid query',
    );
  });
  expect(stdout).toBe('');
});

it('encodes codegen watch setup failures as a fatal document before generation', async () => {
  vi.mocked(getRemixConfig).mockRejectedValueOnce(
    new AbortError('Invalid project configuration'),
  );
  const {stdout, stderr} = await captureJsonOutput(async () => {
    try {
      await runCodegen({directory: '/project', watch: true});
    } catch (error) {
      await handler(error);
    }
  });
  expect(JSON.parse(stdout)).toEqual({
    error: {type: 'abort', message: 'Invalid project configuration'},
  });
  expect(stderr).toBe('');
});

it('encodes build output paths through the real writer', async () => {
  const result = {
    directory: '/project',
    clientDirectory: '/project/dist/client',
    serverDirectory: '/project/dist/server',
    serverPath: '/project/dist/server/index.js',
  };
  const {stdout} = await captureJsonOutput(() =>
    writeJsonResult(Build.jsonOutputSchema, result),
  );
  expect(JSON.parse(stdout)).toEqual(result);
  expect(() =>
    Build.jsonOutputSchema.encode({...result, serverPath: null} as any),
  ).toThrow();
});

it.each([Build, Codegen, Check])(
  'declares JSON flags and discoverable schemas: %s',
  (command) => {
    expect(command.flags.json).toBeDefined();
    expect(command.description).toContain(command.jsonOutputSchema.name);
  },
);

it.each([Build])(
  'rejects JSON watch mode before execution: %s',
  async (Command) => {
    const command = new Command([], {} as any);
    vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {json: true, watch: true},
    });
    await expect(command.run()).rejects.toThrow(
      '--json cannot be combined with --watch',
    );
  },
);

it('streams Codegen watch lifecycle and repeated results without a finite result', async () => {
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
  } as any);
  vi.mocked(watchCodegen).mockImplementation(
    async (_options, _signal, record) => {
      record({type: 'generation-started', cycle: 1});
      outputInfo('Generating types');
      record({type: 'generation-completed', cycle: 1, files: []});
    },
  );
  const {stdout, stderr} = await captureJsonOutput(() =>
    runCodegen({directory: '/project', watch: true}),
  );
  expect(
    stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line)),
  ).toEqual([
    {type: 'watch-started', directory: '/project'},
    {type: 'generation-started', cycle: 1},
    {type: 'generation-completed', cycle: 1, files: []},
    {type: 'watch-stopped'},
  ]);
  expect(JSON.parse(stderr)).toMatchObject({message: 'Generating types'});
});

it('rejects invalid fields and preserves empty collections', () => {
  expect(() =>
    Check.jsonOutputSchema.encode({
      valid: false,
      missingRoutes: [1],
      reservedRoutes: [],
    } as any),
  ).toThrow();
  expect(() =>
    Codegen.jsonOutputSchema.encode({
      files: [{path: '/project/types', sources: 1}],
    } as any),
  ).toThrow();
  expect(
    JSON.parse(
      Check.jsonOutputSchema.encode({
        valid: true,
        missingRoutes: [],
        reservedRoutes: [],
      }),
    ),
  ).toEqual({valid: true, missingRoutes: [], reservedRoutes: []});
  expect(JSON.parse(Codegen.jsonOutputSchema.encode({files: []}))).toEqual({
    files: [],
  });
});

it('honors the parsed Codegen JSON flag without ambient JSON mode', async () => {
  vi.stubEnv('SHOPIFY_FLAG_JSON', '0');
  vi.mocked(getRemixConfig).mockResolvedValue({
    rootDirectory: '/project',
  } as any);
  vi.mocked(codegen).mockResolvedValue({'types.d.ts': ['app/**/*.tsx']});
  const command = new Codegen([], {} as any);
  vi.spyOn(command as any, 'parse').mockResolvedValue({
    flags: {json: true, path: '/project'},
  });
  await withCapturedStandardStreams(async ({stdout}) => {
    await command.run();
    expect(JSON.parse(stdout())).toEqual({
      files: [{path: '/project/types.d.ts', sources: ['app/**/*.tsx']}],
    });
  });
});

it.each(['--json', 'True', 'y'])(
  'runs Build with clean JSON diagnostics and no Vite progress: %s',
  async (mode) => {
    vi.mocked(realpath).mockResolvedValue('/project');
    vi.mocked(isViteProject).mockResolvedValue(true);
    vi.mocked(getViteConfig).mockResolvedValue({
      userViteConfig: {},
      remixConfig: {appDirectory: '/project/app'},
      clientOutDir: '/project/dist/client',
      serverOutDir: '/project/dist/server',
      serverOutFile: '/project/dist/server/index.js',
    } as any);
    vi.mocked(fileSize).mockResolvedValue(100);
    const build = vi.fn(async (config) => {
      config.customLogger.info('\u001b[32mBuild info\u001b[0m');
      config.customLogger.warn('\u001b[33mBuild warning\u001b[0m');
      config.customLogger.error('\u001b[31mBuild error\u001b[0m');
      return {};
    });
    vi.mocked(importVite).mockResolvedValue({
      createLogger: () => ({}),
      build,
    } as any);
    const argv = mode === '--json' ? [mode] : [];
    vi.stubEnv('SHOPIFY_FLAG_JSON', mode === '--json' ? undefined : mode);
    const parsed = await Parser.parse(argv, {flags: Build.flags});
    expect(parsed.flags.json).toBe(true);
    const command = new Build(argv, {} as any);
    command.id = 'hydrogen:build';
    vi.mocked(isHydrogenProject).mockReturnValue(true);
    vi.spyOn(ShopifyCommand.prototype as any, 'init').mockResolvedValue(
      undefined,
    );
    vi.spyOn(command as any, 'removeEnvVar').mockImplementation(() => {});
    vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {
        ...parsed.flags,
        path: '/project',
        'lockfile-check': false,
        'bundle-stats': false,
        'disable-route-warning': true,
      },
    });
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const {stdout, stderr} = await withCapturedStandardStreams(
      async (streams) => {
        // Match the launcher's context, including its text mode for mixed-case env values.
        await runWithCommandEventsForCommand(argv, () => command._run());
        return {stdout: streams.stdout(), stderr: streams.stderr()};
      },
    );
    expect(JSON.parse(stdout)).toEqual({
      directory: '/project',
      clientDirectory: '/project/dist/client',
      serverDirectory: '/project/dist/server',
      serverPath: '/project/dist/server/index.js',
    });
    expect(build).toHaveBeenCalledTimes(2);
    for (const [config] of build.mock.calls)
      expect(config.logLevel).toBe('warn');
    expect(
      stderr
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual(
      Array.from({length: 2}, () => [
        expect.objectContaining({
          type: 'diagnostic',
          level: 'info',
          message: 'Build info',
        }),
        expect.objectContaining({
          type: 'diagnostic',
          level: 'warning',
          message: 'Build warning',
        }),
        expect.objectContaining({
          type: 'diagnostic',
          level: 'error',
          message: 'Build error',
        }),
      ]).flat(),
    );
    expect(exit).toHaveBeenCalledWith(0);
  },
);
