import {afterEach, expect, it, vi} from 'vitest';
import * as cliFs from '@shopify/cli-kit/node/fs';
import {installNodeModules} from '@shopify/cli-kit/node/node-package-manager';
import {captureJsonOutput} from '../../../../tests/output.js';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {executeSetupVite, runSetupVite} from './vite.js';

vi.mock('@shopify/cli-kit/node/fs', async (original) => ({
  ...(await original<typeof import('@shopify/cli-kit/node/fs')>()),
}));
vi.mock('@shopify/cli-kit/node/node-package-manager', async (original) => ({
  ...(await original<
    typeof import('@shopify/cli-kit/node/node-package-manager')
  >()),
  installNodeModules: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

it('leaves classic projects untouched when their Hydrogen package has no Vite plugin', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-classic-'));
  try {
    const packageJson = JSON.stringify({
      dependencies: {'@shopify/hydrogen': '2024.1.0'},
    });
    const remixConfig = 'module.exports = {server: "server.ts"};';
    await writeFile(join(directory, 'package.json'), packageJson);
    await writeFile(join(directory, 'remix.config.js'), remixConfig);
    const dependency = join(directory, 'node_modules/@shopify/hydrogen');
    await mkdir(dependency, {recursive: true});
    await writeFile(
      join(dependency, 'package.json'),
      JSON.stringify({
        name: '@shopify/hydrogen',
        exports: {'.': './index.js'},
      }),
    );
    await expect(executeSetupVite({directory})).rejects.toThrow(
      'does not include Vite support',
    );
    expect(await readFile(join(directory, 'package.json'), 'utf8')).toBe(
      packageJson,
    );
    expect(await readFile(join(directory, 'remix.config.js'), 'utf8')).toBe(
      remixConfig,
    );
    await expect(readFile(join(directory, 'vite.config.ts'))).rejects.toThrow();
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

async function classicProject(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-vite-'));
  try {
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({dependencies: {'@shopify/hydrogen': '2024.4.0'}}),
    );
    await writeFile(
      join(directory, 'remix.config.js'),
      'module.exports = {server: "server.js", tailwind: true};',
    );
    await writeFile(join(directory, 'server.js'), 'export default {};');
    await mkdir(join(directory, 'app/routes'), {recursive: true});
    await writeFile(
      join(directory, 'app/root.jsx'),
      'export default function App() { return <div />; }',
    );
    const dependency = join(directory, 'node_modules/@shopify/hydrogen');
    await mkdir(dependency, {recursive: true});
    await writeFile(
      join(dependency, 'package.json'),
      JSON.stringify({
        name: '@shopify/hydrogen',
        exports: {'./vite': './vite.js'},
      }),
    );
    await writeFile(join(dependency, 'vite.js'), '');
    await run(directory);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

it('migrates a classic project with missing optional files', async () => {
  await classicProject(async (directory) => {
    const {stdout} = await captureJsonOutput(() => runSetupVite({directory}));
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'success',
      changed: true,
    });
    expect(
      await readFile(join(directory, 'postcss.config.js'), 'utf8'),
    ).toContain('tailwindcss');
    expect(installNodeModules).toHaveBeenCalled();
  });
});

it.each(['remix.env.d.ts', 'postcss.config.js'])(
  'fails without success output when %s is inaccessible',
  async (filename) => {
    await classicProject(async (directory) => {
      const error = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      });
      if (filename === 'remix.env.d.ts') {
        const original = cliFs.moveFile;
        vi.spyOn(cliFs, 'moveFile').mockImplementation((from, to, ...args) => {
          if (from === join(directory, filename)) return Promise.reject(error);
          return original(from, to, ...args);
        });
      } else {
        const original = cliFs.readFile;
        vi.spyOn(cliFs, 'readFile').mockImplementation(((path, ...args) => {
          if (path === join(directory, filename)) return Promise.reject(error);
          return original(path, ...args);
        }) as typeof cliFs.readFile);
      }
      vi.mocked(installNodeModules).mockClear();
      const {stdout} = await captureJsonOutput(async () => {
        await expect(runSetupVite({directory})).rejects.toThrow(
          'Permission denied',
        );
      });
      expect(stdout).toBe('');
      expect(installNodeModules).not.toHaveBeenCalled();
    });
  },
);
