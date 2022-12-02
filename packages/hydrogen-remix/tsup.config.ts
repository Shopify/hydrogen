import {defineConfig} from 'tsup';
import {devConfig, prodConfig, outDir} from '../../tsup.config';

const buildEntry = 'src/build.ts';

export default [
  devConfig,
  prodConfig,
  defineConfig({
    ...prodConfig,
    outDir: `${outDir}/build`,
    entry: {index: buildEntry},
    dts: true,
    onSuccess: undefined,
    minify: false,
  }),
  defineConfig({
    entry: ['src/templates/**/*.ts', 'src/templates/**/*.tsx'],
    outDir: `${outDir}/templates`,
    format: 'esm',
    minify: false,
    bundle: false,
    sourcemap: false,
    splitting: true,
    treeshake: true,
  }),
];
