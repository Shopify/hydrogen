import {afterEach, expect, it, vi} from 'vitest';
import {realpath} from 'node:fs/promises';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {captureJsonOutput} from '../../../tests/output.js';
import {getRemixConfig} from '../../lib/remix-config.js';
import {codegen} from '../../lib/codegen.js';
import Check, {runCheckRoutes} from './check.js';
import Codegen, {runCodegen} from './codegen.js';
import Build from './build.js';
import {getViteConfig, isViteProject} from '../../lib/vite-config.js';
import {importVite} from '../../lib/import-utils.js';
import {fileSize} from '@shopify/cli-kit/node/fs';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {writeJsonResult} from '../../lib/json-output.js';

vi.mock('../../lib/remix-config.js', () => ({
  getRemixConfig: vi.fn(),
  getProjectPaths: () => ({root: '/project'}),
}));
vi.mock('../../lib/codegen.js', () => ({
  codegen: vi.fn(),
  spawnCodegenProcess: vi.fn(),
}));
vi.mock('../../lib/vite-config.js');
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

it.each([Build, Codegen])(
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

it('runs Build with JSON output and disables direct Vite reporter progress', async () => {
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
    config.customLogger.warn('Build warning');
    return {};
  });
  vi.mocked(importVite).mockResolvedValue({
    createLogger: () => ({}),
    build,
  } as any);
  const command = new Build([], {} as any);
  vi.spyOn(command as any, 'parse').mockResolvedValue({
    flags: {
      json: true,
      path: '/project',
      'lockfile-check': false,
      'bundle-stats': false,
      'disable-route-warning': true,
    },
  });
  const exit = vi
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);
  const {stdout, stderr} = await captureJsonOutput(() => command.run());
  expect(JSON.parse(stdout)).toEqual({
    directory: '/project',
    clientDirectory: '/project/dist/client',
    serverDirectory: '/project/dist/server',
    serverPath: '/project/dist/server/index.js',
  });
  expect(build).toHaveBeenCalledTimes(2);
  for (const [config] of build.mock.calls) expect(config.logLevel).toBe('warn');
  expect(
    stderr
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line)),
  ).toEqual([
    expect.objectContaining({
      type: 'diagnostic',
      level: 'warning',
      message: 'Build warning',
    }),
    expect.objectContaining({
      type: 'diagnostic',
      level: 'warning',
      message: 'Build warning',
    }),
  ]);
  expect(exit).toHaveBeenCalledWith(0);
});
