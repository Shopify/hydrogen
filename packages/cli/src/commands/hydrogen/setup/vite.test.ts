import {expect, it} from 'vitest';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {executeSetupVite} from './vite.js';

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
