import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../worker/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../worker/index.js')>();

  return {
    ...actual,
    createMiniOxygen: vi.fn(() => ({
      ready: Promise.resolve({workerUrl: new URL('http://localhost:3000')}),
      dispatchFetch: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

vi.mock('../common/find-port.js', () => ({
  findPort: vi.fn(async () => 9100),
}));

import type {Plugin} from 'vite';
import {createMiniOxygen} from '../worker/index.js';
import {oxygen, type OxygenPluginOptions} from './plugin.js';

const tempRoots: string[] = [];

function getOxygenPlugin(options?: OxygenPluginOptions) {
  return oxygen(options)[0] as Plugin<{
    registerPluginOptions(newOptions: {
      compatibilityDate?: string;
      env?: Record<string, string>;
      envPromise?: Promise<Record<string, string>>;
    }): void;
  }>;
}

function createRootWithHydrogenPackageJson(source: string) {
  const root = mkdtempSync(join(tmpdir(), 'mini-oxygen-'));
  tempRoots.push(root);

  const hydrogenPackageRoot = join(
    root,
    'node_modules',
    '@shopify',
    'hydrogen',
  );

  mkdirSync(hydrogenPackageRoot, {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({}));
  writeFileSync(join(hydrogenPackageRoot, 'package.json'), source);

  return root;
}

function createRootWithHydrogenVersion(version: string) {
  return createRootWithHydrogenPackageJson(
    JSON.stringify({
      name: '@shopify/hydrogen',
      version,
      exports: {'./package.json': './package.json'},
    }),
  );
}

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'mini-oxygen-'));
  tempRoots.push(root);

  return root;
}

function runConfigHook(
  plugin: Plugin,
  config: Record<string, any>,
  env?: Record<string, any>,
) {
  if (typeof plugin.config !== 'function') {
    throw new Error('Expected oxygen plugin to expose a config hook.');
  }

  return (plugin.config as any)(config, {
    command: 'build',
    mode: 'production',
    isSsrBuild: false,
    isPreview: false,
    ...env,
  });
}

function runGenerateBundle(plugin: Plugin) {
  if (typeof plugin.generateBundle !== 'function') {
    throw new Error('Expected oxygen plugin to expose a generateBundle hook.');
  }

  const emitFile = vi.fn();
  plugin.generateBundle.call({emitFile} as any, {} as any, {} as any, false);

  return emitFile;
}

function runSsrBuildHooks(plugin: Plugin, root: string) {
  runConfigHook(plugin, {}, {isSsrBuild: true});
  runConfigResolvedHook(plugin, root);

  return runGenerateBundle(plugin);
}

function runConfigResolvedHook(plugin: Plugin, root: string) {
  const hook =
    typeof plugin.configResolved === 'function'
      ? plugin.configResolved
      : plugin.configResolved?.handler;

  if (!hook) {
    throw new Error('Expected oxygen plugin to expose a configResolved hook.');
  }

  (hook as any)({root});
}

function runConfigEnvironmentHook(plugin: Plugin, name: string) {
  if (typeof plugin.configEnvironment !== 'function') {
    throw new Error(
      'Expected oxygen plugin to expose a configEnvironment hook.',
    );
  }

  return (plugin.configEnvironment as any)(name);
}

async function runConfigurePreviewServerHook(
  plugin: Plugin,
  {
    root,
    clientOutDir = join(root, 'dist/client'),
  }: {
    root: string;
    clientOutDir?: string;
  },
) {
  const hook =
    typeof plugin.configurePreviewServer === 'function'
      ? plugin.configurePreviewServer
      : plugin.configurePreviewServer?.handler;

  if (!hook) {
    throw new Error(
      'Expected oxygen plugin to expose a configurePreviewServer hook.',
    );
  }

  const previewServer = {
    config: {
      root,
      mode: 'development',
      envDir: root,
      build: {outDir: clientOutDir},
      environments: {client: {build: {outDir: clientOutDir}}},
    },
    httpServer: {once: vi.fn()},
    middlewares: {use: vi.fn()},
  };

  const postHook = await (hook as any)(previewServer);
  postHook?.();

  return previewServer;
}

function getLastPreviewBindings() {
  const options = vi.mocked(createMiniOxygen).mock.calls.at(-1)?.[0] as any;

  return options?.workers?.[0]?.bindings;
}

describe('oxygen Vite plugin', () => {
  afterEach(() => {
    vi.mocked(createMiniOxygen).mockClear();
    delete process.env.MINI_OXYGEN_PROCESS_ENV;

    for (const root of tempRoots.splice(0)) {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('does not set a default build output directory', () => {
    const plugin = getOxygenPlugin();

    expect(runConfigHook(plugin, {})).not.toHaveProperty('build');
  });

  it('does not override a user-provided build output directory', () => {
    const plugin = getOxygenPlugin();

    expect(
      runConfigHook(plugin, {build: {outDir: 'custom-dist'}}),
    ).not.toHaveProperty('build.outDir');
  });

  it('does not add worker conditions to the top-level client resolver', () => {
    const plugin = getOxygenPlugin();

    expect(runConfigHook(plugin, {})).not.toHaveProperty('resolve.conditions');
  });

  it('adds worker conditions to SSR resolution only', () => {
    const plugin = getOxygenPlugin();

    const config = runConfigHook(plugin, {});
    expect(config).toHaveProperty('ssr.resolve.conditions');
    expect(config.ssr.resolve.conditions).toContain('worker');
    expect(config.ssr.resolve.conditions).toContain('workerd');

    expect(runConfigEnvironmentHook(plugin, 'client')).toBeUndefined();

    const ssrEnvironmentConfig = runConfigEnvironmentHook(plugin, 'ssr');
    expect(ssrEnvironmentConfig).toHaveProperty('resolve.conditions');
    expect(ssrEnvironmentConfig.resolve.conditions).toContain('worker');
    expect(ssrEnvironmentConfig.resolve.conditions).toContain('workerd');
  });

  it.each([
    'virtual:oxygen-framework-entry',
    '@shopify/oxygen-framework/worker',
  ])('uses configured entry "%s" for SSR build defaults', (entry) => {
    const plugin = getOxygenPlugin({entry});

    expect(
      runConfigHook(plugin, {build: {ssr: true}}, {isSsrBuild: true}),
    ).toHaveProperty('build.ssr', entry);
  });

  it('does not emit oxygen.json during client builds', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenVersion('2026.4.4');

    runConfigHook(plugin, {}, {isSsrBuild: false});
    runConfigResolvedHook(plugin, root);
    const emitFile = runGenerateBundle(plugin);

    expect(emitFile).not.toHaveBeenCalled();
  });

  it('emits oxygen.json from the installed Hydrogen version during SSR builds', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenVersion('2026.4.4');

    const emitFile = runSsrBuildHooks(plugin, root);

    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'oxygen.json',
      source: JSON.stringify(
        {version: 1, compatibility_date: '2025-04-01'},
        null,
        2,
      ),
    });
  });

  it('uses explicit compatibility dates before inferred dates', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenVersion('2026.4.4');

    runConfigHook(plugin, {}, {isSsrBuild: true});
    runConfigResolvedHook(plugin, root);
    plugin.api?.registerPluginOptions({compatibilityDate: '2025-04-01'});
    const emitFile = runGenerateBundle(plugin);

    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'oxygen.json',
      source: JSON.stringify(
        {version: 1, compatibility_date: '2025-04-01'},
        null,
        2,
      ),
    });
  });

  it('does not emit oxygen.json when resolved Hydrogen metadata cannot be read', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenPackageJson('{');

    const emitFile = runSsrBuildHooks(plugin, root);

    expect(emitFile).not.toHaveBeenCalled();
  });

  it('uses the server directory next to the Vite client output for preview', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'build/client');
    const workerFile = join(root, 'build/server/index.js');

    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'build/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');

    const previewServer = await runConfigurePreviewServerHook(plugin, {
      root,
      clientOutDir,
    });

    expect(createMiniOxygen).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.objectContaining({directory: clientOutDir}),
        workers: [
          expect.objectContaining({
            modulesRoot: join(root, 'build/server'),
            modules: [
              expect.objectContaining({
                path: workerFile,
                contents: 'export default {fetch() {}};',
              }),
            ],
          }),
        ],
      }),
    );
    expect(previewServer.middlewares.use).toHaveBeenCalledOnce();
  });

  it('uses the configured preview entry', async () => {
    const plugin = getOxygenPlugin({previewEntry: 'custom/worker.mjs'});
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'custom/worker.mjs');

    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'custom'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(createMiniOxygen).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: [
          expect.objectContaining({
            modulesRoot: join(root, 'custom'),
            modules: [expect.objectContaining({path: workerFile})],
          }),
        ],
      }),
    );
  });

  it('falls back to the default dist server entry for preview', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'custom/client');
    const workerFile = join(root, 'dist/server/index.mjs');

    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(createMiniOxygen).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: [
          expect.objectContaining({
            modulesRoot: join(root, 'dist/server'),
            modules: [expect.objectContaining({path: workerFile})],
          }),
        ],
      }),
    );
  });

  it('loads local Vite env as preview bindings when no env is configured', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'dist/server/index.js');

    writeFileSync(join(root, '.env'), 'MINI_OXYGEN_LOCAL_ENV=local\n');
    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(getLastPreviewBindings()).toHaveProperty(
      'MINI_OXYGEN_LOCAL_ENV',
      'local',
    );
  });

  it('does not load Vite env when CLI envPromise is registered', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'dist/server/index.js');

    process.env.MINI_OXYGEN_PROCESS_ENV = 'process';
    writeFileSync(join(root, '.env'), 'MINI_OXYGEN_LOCAL_ENV=local\n');
    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');
    plugin.api?.registerPluginOptions({
      envPromise: Promise.resolve({MINI_OXYGEN_CLI_ENV: 'cli'}),
    });

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(getLastPreviewBindings()).toHaveProperty(
      'MINI_OXYGEN_CLI_ENV',
      'cli',
    );
    expect(getLastPreviewBindings()).not.toHaveProperty(
      'MINI_OXYGEN_LOCAL_ENV',
    );
    expect(getLastPreviewBindings()).not.toHaveProperty(
      'MINI_OXYGEN_PROCESS_ENV',
    );
  });

  it('does not load local Vite env when plugin env is configured', async () => {
    const plugin = getOxygenPlugin({
      env: {MINI_OXYGEN_PLUGIN_ENV: 'plugin'},
    });
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'dist/server/index.js');

    writeFileSync(join(root, '.env'), 'MINI_OXYGEN_LOCAL_ENV=local\n');
    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(getLastPreviewBindings()).toHaveProperty(
      'MINI_OXYGEN_PLUGIN_ENV',
      'plugin',
    );
    expect(getLastPreviewBindings()).not.toHaveProperty(
      'MINI_OXYGEN_LOCAL_ENV',
    );
  });

  it('does not load local Vite env when CLI env is registered', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'dist/server/index.js');

    writeFileSync(join(root, '.env'), 'MINI_OXYGEN_LOCAL_ENV=local\n');
    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');
    plugin.api?.registerPluginOptions({
      env: {MINI_OXYGEN_CLI_ENV: 'cli'},
    });

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(getLastPreviewBindings()).toHaveProperty(
      'MINI_OXYGEN_CLI_ENV',
      'cli',
    );
    expect(getLastPreviewBindings()).not.toHaveProperty(
      'MINI_OXYGEN_LOCAL_ENV',
    );
  });

  it('loads local Vite env when registered options do not include env', async () => {
    const plugin = getOxygenPlugin();
    const root = createRoot();
    const clientOutDir = join(root, 'dist/client');
    const workerFile = join(root, 'dist/server/index.js');

    writeFileSync(join(root, '.env'), 'MINI_OXYGEN_LOCAL_ENV=local\n');
    mkdirSync(clientOutDir, {recursive: true});
    mkdirSync(join(root, 'dist/server'), {recursive: true});
    writeFileSync(workerFile, 'export default {fetch() {}};');
    plugin.api?.registerPluginOptions({compatibilityDate: '2026-04-01'});

    await runConfigurePreviewServerHook(plugin, {root, clientOutDir});

    expect(getLastPreviewBindings()).toHaveProperty(
      'MINI_OXYGEN_LOCAL_ENV',
      'local',
    );
  });
});
