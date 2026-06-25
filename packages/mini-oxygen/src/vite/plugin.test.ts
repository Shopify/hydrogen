import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Plugin} from 'vite';
import {oxygen, type OxygenPluginOptions} from './plugin.js';

const tempRoots: string[] = [];

function getOxygenPlugin(options?: OxygenPluginOptions) {
  return oxygen(options)[0] as Plugin<{
    registerPluginOptions(newOptions: {compatibilityDate?: string}): void;
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

describe('oxygen Vite plugin', () => {
  afterEach(() => {
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

  it('emits oxygen.json from the installed Hydrogen version', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenVersion('2026.4.4');

    runConfigResolvedHook(plugin, root);
    const emitFile = runGenerateBundle(plugin);

    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'oxygen.json',
      source: JSON.stringify(
        {version: 1, compatibility_date: '2026-04-01'},
        null,
        2,
      ),
    });
  });

  it('uses explicit compatibility dates before inferred dates', () => {
    const plugin = getOxygenPlugin();
    const root = createRootWithHydrogenVersion('2026.4.4');

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

    runConfigResolvedHook(plugin, root);
    const emitFile = runGenerateBundle(plugin);

    expect(emitFile).not.toHaveBeenCalled();
  });
});
