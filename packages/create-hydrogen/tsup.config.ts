import {defineConfig} from 'tsup';
import {createRequire} from 'module';
import fs from 'fs/promises';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'esm',
  minify: false,
  bundle: false,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  dts: false,
  async onSuccess() {
    const require = createRequire(import.meta.url);
    const {version} = require('@shopify/cli-hydrogen/package.json');

    const content = await fs.readFile('./package.json', 'utf-8');
    await fs.writeFile(
      './package.json',
      content.replace(
        /"(@shopify\/cli-hydrogen)":\s+".*"/gm,
        `"$1": "^${version}"`,
      ),
      'utf-8',
    );
  },
});
